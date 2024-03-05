/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataLoadingState, UnifiedDataTable } from '@kbn/unified-data-table';
import React, { ReactElement, useCallback, useState } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { CellActionsProvider } from '@kbn/cell-actions';
import { buildDataTableRecordList } from '@kbn/discover-utils';
import { useEsSearch } from '@kbn/observability-shared-plugin/public';
import { kqlQuerySchema, QuerySchema } from '@kbn/slo-schema';
import { EuiResizableContainer, EuiProgress } from '@elastic/eui';
import { UnifiedFieldListSidebarContainer } from '@kbn/unified-field-list';
import { buildFilter, FILTERS, TimeRange } from '@kbn/es-query';
import { FieldPath, useFormContext } from 'react-hook-form';
import { Serializable } from '@kbn/utility-types';
import { CreateSLOForm } from '../../types';
import { getElasticsearchQueryOrThrow } from '../../../../../common/utils/parse_kuery';
import { useKibana } from '../../../../utils/kibana_react';

export function DocumentsTable({
  dataView,
  searchBar,
  filter,
  range,
  name,
}: {
  filter: QuerySchema;
  dataView: DataView;
  searchBar: ReactElement;
  range: TimeRange;
  name: FieldPath<CreateSLOForm>;
}) {
  const { setValue } = useFormContext<CreateSLOForm>();

  const [sampleSize, setSampleSize] = useState(100);
  const [columns, setColumns] = useState<string[]>([]);
  const services = useKibana().services;
  const esFilter = getElasticsearchQueryOrThrow(filter);
  const [sizes, setSizes] = useState({
    fieldsPanel: 180,
    documentsPanel: 500,
  });
  const onPanelWidthChange = useCallback((newSizes: Record<string, number>) => {
    setSizes((prevSizes) => ({
      ...prevSizes,
      ...newSizes,
    }));
  }, []);

  const { data, loading } = useEsSearch(
    {
      index: dataView.getIndexPattern(),
      size: sampleSize,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: range.from,
                  lte: range.to,
                },
              },
            },
            esFilter,
          ],
        },
      },
    },
    [range.from, range.to, dataView, JSON.stringify(filter), sampleSize],
    {
      name: 'slo-edit-documents-table',
    }
  );

  return (
    <>
      {searchBar}
      <EuiResizableContainer
        style={{ height: 'calc(100vh - 300px)' }}
        onPanelWidthChange={onPanelWidthChange}
      >
        {(EuiResizablePanel, EuiResizableButton) => (
          <>
            <EuiResizablePanel
              id="fieldsPanel"
              size={sizes.fieldsPanel}
              minSize="10%"
              tabIndex={0}
              style={{
                paddingLeft: 0,
                paddingRight: 0,
              }}
            >
              <UnifiedFieldListSidebarContainer
                services={{
                  core: services,
                  ...services,
                }}
                dataView={dataView}
                workspaceSelectedFieldNames={columns}
                allFields={dataView.fields}
                onAddFieldToWorkspace={(field) => {
                  setColumns((prevColumns) => [
                    ...(prevColumns.length === 0 ? ['@timestamp'] : prevColumns),
                    field.name,
                  ]);
                }}
                onRemoveFieldFromWorkspace={(field) => {
                  setColumns((prevColumns) => prevColumns.filter((c) => c !== field.name));
                }}
                getCreationOptions={() => ({
                  originatingApp: 'observability',
                })}
              />
            </EuiResizablePanel>

            <EuiResizableButton indicator="border" />

            <EuiResizablePanel
              id="documentsPanel"
              size={sizes.documentsPanel}
              minSize="200px"
              tabIndex={0}
            >
              <CellActionsProvider
                getTriggerCompatibleActions={services.uiActions.getTriggerCompatibleActions}
              >
                {loading && <EuiProgress size="xs" color="accent" />}
                <UnifiedDataTable
                  rows={buildDataTableRecordList((data?.hits?.hits ?? []) as any, dataView)}
                  showColumnTokens
                  dataView={dataView}
                  onFilter={(fieldK, val, mode) => {
                    if (fieldK && typeof fieldK !== 'string' && 'name' in fieldK) {
                      const dField = dataView.getFieldByName(fieldK?.name);
                      if (!dField) {
                        return;
                      }
                      const filterN = buildFilter(
                        dataView,
                        dField,
                        FILTERS.PHRASE,
                        mode === '-',
                        false,
                        val as Serializable,
                        null
                      );
                      if (kqlQuerySchema.is(filter)) {
                        setValue(name, {
                          filters: [filterN],
                          kqlQuery: filter,
                        });
                      } else {
                        setValue(name, {
                          ...(filter ?? {}),
                          filters: [filterN],
                        });
                      }
                    }
                  }}
                  services={services}
                  ariaLabelledBy={i18n.translate(
                    'xpack.observability.slo.edit.documentsTableAriaLabel',
                    {
                      defaultMessage: 'Documents table',
                    }
                  )}
                  loadingState={loading ? DataLoadingState.loading : DataLoadingState.loaded}
                  columns={columns}
                  onSetColumns={setColumns}
                  showTimeCol={true}
                  sampleSizeState={sampleSize}
                  onUpdateSampleSize={(nSample) => {
                    setSampleSize(nSample);
                  }}
                  sort={[]}
                  useNewFieldsApi={true}
                  showFullScreenButton={false}
                />
              </CellActionsProvider>
            </EuiResizablePanel>
          </>
        )}
      </EuiResizableContainer>
    </>
  );
}
