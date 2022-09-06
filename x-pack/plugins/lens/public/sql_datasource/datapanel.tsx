/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormControlLayout, htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import usePrevious from 'react-use/lib/usePrevious';
import { isEqual } from 'lodash';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';

import { isOfAggregateQueryType, getIndexPatternFromSQLQuery } from '@kbn/es-query';
import { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { FieldButton } from '@kbn/react-field';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { generateId } from '../id_generator';
import { DatasourceDataPanelProps, DataType } from '../types';
import type { EsSQLPrivateState, IndexPatternRef } from './types';
import { fetchSql } from './fetch_sql';
import { loadIndexPatternRefs } from './utils';
import { DragDrop } from '../drag_drop';
import { LensFieldIcon } from '../shared_components';
import { ChildDragDropProvider } from '../drag_drop';

export type Props = DatasourceDataPanelProps<EsSQLPrivateState> & {
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
  dataViews: DataViewsPublicPluginStart;
};
const htmlId = htmlIdGenerator('datapanel-sql');
const fieldSearchDescriptionId = htmlId();

export function EsSQLDataPanel({
  setState,
  state,
  dragDropContext,
  core,
  data,
  query,
  filters,
  dateRange,
  expressions,
  dataViews,
}: Props) {
  const prevQuery = usePrevious(query);
  const [localState, setLocalState] = useState({ nameFilter: '' });
  const clearLocalState = () => setLocalState((s) => ({ ...s, nameFilter: '' }));
  useEffect(() => {
    async function fetchData() {
      if (query && isOfAggregateQueryType(query) && 'sql' in query && !isEqual(query, prevQuery)) {
        const indexPatternRefs: IndexPatternRef[] = await loadIndexPatternRefs(dataViews);
        const table = await fetchSql(query, dataViews, data, expressions);
        const indexPattern = getIndexPatternFromSQLQuery(query.sql);
        const index = indexPatternRefs.find((r) => r.title === indexPattern)?.id ?? '';
        const dataView = await dataViews.get(index);
        const timeFieldName = dataView.timeFieldName;
        const columnsFromQuery = table?.columns ?? [];
        const layerIds = Object.keys(state.layers);
        const newLayerId = layerIds.length > 0 ? layerIds[0] : generateId();
        const existingColumns = state.layers[newLayerId].columns;
        const columns = [
          ...existingColumns,
          ...columnsFromQuery.map((c) => ({ columnId: c.id, fieldName: c.id })),
        ];
        const uniqueIds: string[] = [];

        const unique = columns.filter((col) => {
          const isDuplicate = uniqueIds.includes(col.columnId);

          if (!isDuplicate) {
            uniqueIds.push(col.columnId);

            return true;
          }

          return false;
        });

        const tempState = {
          layers: {
            [newLayerId]: {
              index,
              query,
              columns: unique,
              timeField: timeFieldName,
            },
          },
        };

        const fieldList = unique.map((u) => {
          const field = columnsFromQuery.find((c) => c.name === u.fieldName);
          return {
            name: u.fieldName,
            id: u.columnId,
            meta: field?.meta,
          };
        }) as DatatableColumn[];

        setState({
          ...tempState,
          fieldList: fieldList ?? [],
          removedLayers: [],
          indexPatternRefs,
        });
      }
    }
    fetchData();
  }, [data, dataViews, expressions, prevQuery, query, setState, state.layers]);

  const [openPopover, setOpenPopover] = useState('');

  const { fieldList } = state;
  const filteredFields = useMemo(() => {
    return fieldList.filter((field) => {
      if (
        localState.nameFilter &&
        !field.name.toLowerCase().includes(localState.nameFilter.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [fieldList, localState.nameFilter]);

  return (
    <KibanaContextProvider
      services={{
        ...core,
      }}
    >
      <ChildDragDropProvider {...dragDropContext}>
        <EuiFlexGroup
          gutterSize="none"
          className="lnsInnerIndexPatternDataPanel"
          direction="column"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiFormControlLayout
              icon="search"
              fullWidth
              clear={{
                title: i18n.translate('xpack.lens.indexPatterns.clearFiltersLabel', {
                  defaultMessage: 'Clear name and type filters',
                }),
                'aria-label': i18n.translate('xpack.lens.indexPatterns.clearFiltersLabel', {
                  defaultMessage: 'Clear name and type filters',
                }),
                onClick: () => {
                  clearLocalState();
                },
              }}
            >
              <input
                className="euiFieldText euiFieldText--fullWidth lnsInnerIndexPatternDataPanel__textField"
                data-test-subj="lnsIndexPatternFieldSearch"
                placeholder={i18n.translate('xpack.lens.indexPatterns.filterByNameLabel', {
                  defaultMessage: 'Search field names',
                  description: 'Search the list of fields in the data view for the provided text',
                })}
                value={localState.nameFilter}
                onChange={(e) => {
                  setLocalState({ ...localState, nameFilter: e.target.value });
                }}
                aria-label={i18n.translate('xpack.lens.indexPatterns.filterByNameLabel', {
                  defaultMessage: 'Search field names',
                  description: 'Search the list of fields in the data view for the provided text',
                })}
                aria-describedby={fieldSearchDescriptionId}
              />
            </EuiFormControlLayout>
          </EuiFlexItem>
          <EuiFlexItem>
            <div className="lnsIndexPatternFieldList">
              <div className="lnsIndexPatternFieldList__accordionContainer">
                <ul className="lnsInnerIndexPatternDataPanel__fieldItems">
                  {filteredFields.length > 0 &&
                    filteredFields.map((field, index) => (
                      <li key={field?.name}>
                        <DragDrop
                          draggable
                          order={[index]}
                          value={{
                            field: field?.name,
                            id: field.id,
                            humanData: { label: field?.name },
                          }}
                          dataTestSubj={`lnsFieldListPanelField-${field.name}`}
                        >
                          <FieldButton
                            className={`lnsFieldItem lnsFieldItem--${field?.meta?.type}`}
                            isActive={openPopover === field.name}
                            onClick={() => {
                              if (openPopover === field.name) {
                                setOpenPopover('');
                              } else {
                                setOpenPopover(field.name);
                              }
                            }}
                            buttonProps={{
                              ['aria-label']: i18n.translate(
                                'xpack.lens.indexPattern.fieldStatsButtonAriaLabel',
                                {
                                  defaultMessage: 'Preview {fieldName}: {fieldType}',
                                  values: {
                                    fieldName: field?.name,
                                    fieldType: field?.meta.type,
                                  },
                                }
                              ),
                            }}
                            fieldIcon={<LensFieldIcon type={field?.meta.type as DataType} />}
                            fieldName={field?.name}
                          />
                        </DragDrop>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ChildDragDropProvider>
    </KibanaContextProvider>
  );
}
