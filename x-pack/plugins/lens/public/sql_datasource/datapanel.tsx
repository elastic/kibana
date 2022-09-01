/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import usePrevious from 'react-use/lib/usePrevious';
import { isEqual } from 'lodash';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

import { isOfAggregateQueryType, getIndexPatternFromSQLQuery } from '@kbn/es-query';
import { ExpressionsStart, DatatableColumn } from '@kbn/expressions-plugin/public';
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
  const [localState, setLocalState] = useState(state);
  useEffect(() => {
    async function fetchData() {
      const cachedFieldList: Record<string, { fields: DatatableColumn[]; singleRow: boolean }> = {};
      if (query && isOfAggregateQueryType(query) && 'sql' in query && !isEqual(query, prevQuery)) {
        const indexPatternRefs: IndexPatternRef[] = await loadIndexPatternRefs(dataViews);
        const table = await fetchSql(query, dataViews, data, expressions);
        const indexPattern = getIndexPatternFromSQLQuery(query.sql);
        const index = indexPatternRefs.find((r) => r.title === indexPattern)?.id ?? '';
        const columns = table?.columns ?? [];
        const layerIds = Object.keys(state.layers);
        const newLayerId = layerIds.length > 0 ? layerIds[0] : generateId();
        cachedFieldList[newLayerId] = {
          fields: columns ?? [],
          singleRow: table?.rows.length === 1,
        };
        const tempState = {
          layers: {
            [newLayerId]: {
              index,
              query: query.sql,
              columns: columns.map((c) => ({ columnId: c.id, fieldName: c.id })),
            },
          },
        };

        setState({
          ...tempState,
          cachedFieldList,
          removedLayers: [],
          indexPatternRefs,
        });
      }
    }
    fetchData();
  }, [data, dataViews, expressions, prevQuery, query, setState, state.layers]);

  useEffect(() => {
    setLocalState(state);
  }, [state]);

  const [openPopover, setOpenPopover] = useState('');

  const { layers, cachedFieldList } = localState;

  return (
    <KibanaContextProvider
      services={{
        ...core,
      }}
    >
      <ChildDragDropProvider {...dragDropContext}>
        <EuiSpacer size="xxl" />
        <EuiFlexGroup direction="column">
          {layers &&
            Object.entries(layers).map(([id, layer]) => {
              return (
                <EuiFlexItem key={id}>
                  <EuiPanel>
                    <ul className="lnsInnerIndexPatternDataPanel__fieldItems">
                      {cachedFieldList[id]?.fields.length > 0 &&
                        cachedFieldList[id].fields.map((field, index) => (
                          <li key={field?.name}>
                            <DragDrop
                              draggable
                              order={[index]}
                              value={{
                                isSqlField: true,
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
                  </EuiPanel>
                </EuiFlexItem>
              );
            })}
        </EuiFlexGroup>
      </ChildDragDropProvider>
    </KibanaContextProvider>
  );
}
