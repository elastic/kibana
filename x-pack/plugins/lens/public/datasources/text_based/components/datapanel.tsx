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
  FieldListGrouped,
  FieldListGroupedProps,
  FieldsGroupNames,
  GetCustomFieldType,
  useGroupedFields,
} from '@kbn/unified-field-list';
import type { DatasourceDataPanelProps } from '../../../types';
import type { TextBasedPrivateState } from '../types';
import { getStateFromAggregateQuery } from '../utils';
import { FieldItem } from '../../common/field_item';
import { getColumnsFromCache } from '../fieldlist_cache';

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
  core,
  data,
  query,
  frame,
  filters,
  dateRange,
  expressions,
  dataViews,
  layerFields,
  hasSuggestionForField,
  dropOntoWorkspace,
}: Omit<TextBasedDataPanelProps, 'dragDropContext'>) {
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
  const fieldList = isOfAggregateQueryType(query) ? getColumnsFromCache(query) : [];

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
    allFields: dataHasLoaded ? fieldList ?? [] : null,
    services: {
      dataViews,
      core,
    },
    getCustomFieldType,
    onSelectedFieldFilter,
    onOverrideFieldGroupDetails,
  });

  const renderFieldItem: FieldListGroupedProps<DatatableColumn>['renderFieldItem'] = useCallback(
    ({ field, groupIndex, itemIndex, fieldSearchHighlight, groupName }) => {
      if (!field) {
        return <></>;
      }

      return (
        <FieldItem
          field={field}
          exists
          hideDetails
          itemIndex={itemIndex}
          groupIndex={groupIndex}
          dropOntoWorkspace={dropOntoWorkspace}
          hasSuggestionForField={hasSuggestionForField}
          highlight={fieldSearchHighlight}
          getCustomFieldType={getCustomFieldType}
        />
      );
    },
    [hasSuggestionForField, dropOntoWorkspace]
  );

  return (
    <KibanaContextProvider
      services={{
        ...core,
      }}
    >
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
    </KibanaContextProvider>
  );
}
