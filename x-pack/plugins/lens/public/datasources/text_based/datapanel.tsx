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

import { isOfAggregateQueryType } from '@kbn/es-query';
import { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DatasourceDataPanelProps } from '../../types';
import type { TextBasedPrivateState } from './types';
import { getStateFromAggregateQuery } from './utils';
import { ChildDragDropProvider } from '../../drag_drop';
import { FieldsAccordion } from './fields_accordion';

export type TextBasedDataPanelProps = DatasourceDataPanelProps<TextBasedPrivateState> & {
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
  dataViews: DataViewsPublicPluginStart;
  layerFields?: string[];
};
const htmlId = htmlIdGenerator('datapanel-text-based-languages');
const fieldSearchDescriptionId = htmlId();

export function TextBasedDataPanel({
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
  layerFields,
}: TextBasedDataPanelProps) {
  const prevQuery = usePrevious(query);
  const [localState, setLocalState] = useState({ nameFilter: '' });
  const [dataHasLoaded, setDataHasLoaded] = useState(false);
  const clearLocalState = () => setLocalState((s) => ({ ...s, nameFilter: '' }));
  useEffect(() => {
    async function fetchData() {
      if (query && isOfAggregateQueryType(query) && !isEqual(query, prevQuery)) {
        const stateFromQuery = await getStateFromAggregateQuery(
          state,
          query,
          dataViews,
          data,
          expressions
        );

        setDataHasLoaded(true);
        setState(stateFromQuery);
      }
    }
    fetchData();
  }, [data, dataViews, expressions, prevQuery, query, setState, state]);

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
  const usedByLayersFields = fieldList.filter((field) => layerFields?.includes(field.name));

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
                data-test-subj="lnsTextBasedLangugesFieldSearch"
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
                {usedByLayersFields.length > 0 && (
                  <FieldsAccordion
                    initialIsOpen={true}
                    hasLoaded={dataHasLoaded}
                    isFiltered={Boolean(localState.nameFilter)}
                    fields={usedByLayersFields}
                    id="lnsSelectedFieldsTextBased"
                    label={i18n.translate('xpack.lens.textBased.selectedFieldsLabel', {
                      defaultMessage: 'Selected fields',
                    })}
                  />
                )}
                <FieldsAccordion
                  initialIsOpen={true}
                  hasLoaded={dataHasLoaded}
                  isFiltered={Boolean(localState.nameFilter)}
                  fields={filteredFields}
                  id="lnsAvailableFieldsTextBased"
                  label={i18n.translate('xpack.lens.textBased.availableFieldsLabel', {
                    defaultMessage: 'Available fields',
                  })}
                />
              </div>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ChildDragDropProvider>
    </KibanaContextProvider>
  );
}
