/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import usePrevious from 'react-use/lib/usePrevious';
import { isEqual } from 'lodash';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

import { isOfAggregateQueryType } from '@kbn/es-query';
import { DatatableColumn, ExpressionsStart } from '@kbn/expressions-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  FieldList,
  FieldListFilters,
  FieldItemButton,
  GetCustomFieldType,
  FieldListGrouped,
  FieldListGroupedProps,
  FieldsGroupNames,
  useGroupedFields,
} from '@kbn/unified-field-list-plugin/public';
import { ChildDragDropProvider, DragDrop } from '@kbn/dom-drag-drop';
import type { DatasourceDataPanelProps } from '../../types';
import type { TextBasedPrivateState } from './types';
import { getStateFromAggregateQuery } from './utils';

const getCustomFieldType: GetCustomFieldType<DatatableColumn> = (field) => field?.meta.type;

export type TextBasedDataPanelProps = DatasourceDataPanelProps<TextBasedPrivateState> & {
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
  dataViews: DataViewsPublicPluginStart;
  layerFields?: string[];
};

export function TextBasedDataPanel({
  setState,
  state,
  dragDropContext,
  core,
  data,
  query,
  frame,
  filters,
  dateRange,
  expressions,
  dataViews,
  layerFields,
}: TextBasedDataPanelProps) {
  const prevQuery = usePrevious(query);
  const [dataHasLoaded, setDataHasLoaded] = useState(false);
  useEffect(() => {
    async function fetchData() {
      if (query && isOfAggregateQueryType(query) && !isEqual(query, prevQuery)) {
        const frameDataViews = frame.dataViews;
        const stateFromQuery = await getStateFromAggregateQuery(
          state,
          query,
          dataViews,
          data,
          expressions,
          frameDataViews
        );

        setDataHasLoaded(true);
        setState(stateFromQuery);
      }
    }
    fetchData();
  }, [data, dataViews, expressions, prevQuery, query, setState, state, frame.dataViews]);

  const { fieldList } = state;

  const onSelectedFieldFilter = useCallback(
    (field: DatatableColumn): boolean => {
      return Boolean(layerFields?.includes(field.name));
    },
    [layerFields]
  );

  const onOverrideFieldGroupDetails = useCallback((groupName) => {
    if (groupName === FieldsGroupNames.AvailableFields) {
      return {
        helpText: i18n.translate('xpack.lens.indexPattern.allFieldsForTextBasedLabelHelp', {
          defaultMessage:
            'Drag and drop available fields to the workspace and create visualizations. To change the available fields, edit your query.',
        }),
      };
    }
  }, []);

  const { fieldListFiltersProps, fieldListGroupedProps } = useGroupedFields<DatatableColumn>({
    dataViewId: null,
    allFields: dataHasLoaded ? fieldList : null,
    services: {
      dataViews,
      core,
    },
    getCustomFieldType,
    onSelectedFieldFilter,
    onOverrideFieldGroupDetails,
  });

  const renderFieldItem: FieldListGroupedProps<DatatableColumn>['renderFieldItem'] = useCallback(
    ({ field, itemIndex, fieldSearchHighlight }) => {
      if (!field) {
        return <></>;
      }
      return (
        <DragDrop
          draggable
          order={[itemIndex]}
          value={{
            field: field.name,
            id: field.id,
            humanData: { label: field.name },
          }}
          dataTestSubj={`lnsFieldListPanelField-${field.name}`}
        >
          <FieldItemButton<DatatableColumn>
            isEmpty={false}
            isActive={false}
            field={field}
            fieldSearchHighlight={fieldSearchHighlight}
            getCustomFieldType={getCustomFieldType}
            onClick={() => {}}
          />
        </DragDrop>
      );
    },
    []
  );

  return (
    <KibanaContextProvider
      services={{
        ...core,
      }}
    >
      <ChildDragDropProvider {...dragDropContext}>
        <FieldList
          className="lnsInnerIndexPatternDataPanel"
          isProcessing={!dataHasLoaded}
          prepend={
            <FieldListFilters {...fieldListFiltersProps} data-test-subj="lnsTextBasedLanguages" />
          }
        >
          <FieldListGrouped<DatatableColumn>
            {...fieldListGroupedProps}
            renderFieldItem={renderFieldItem}
            data-test-subj="lnsTextBasedLanguages"
            localStorageKeyPrefix="lens"
          />
        </FieldList>
      </ChildDragDropProvider>
    </KibanaContextProvider>
  );
}
