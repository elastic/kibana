/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SearchBarProps } from '@kbn/unified-search-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import { APP_ID } from '../../../../../../../common';
import { useGetStatefulQueryBar } from '../use_get_stateful_query_bar';

type ESQLTabHeaderProps = SearchBarProps<AggregateQuery>;

export const ESQLTabHeader = (props: ESQLTabHeaderProps) => {
  const { CustomSearchBar } = useGetStatefulQueryBar();

  // const dataViewPickerProps: DataViewPickerProps = useMemo(() => {
  //   const supportedTextBasedLanguages: DataViewPickerProps['textBasedLanguages'] = [
  //     TextBasedLanguages.ESQL,
  //   ];
  //
  //   return {
  //     trigger: {
  //       label: dataView?.getName() || '',
  //       'data-test-subj': 'discover-dataView-switch-link',
  //       title: dataView?.getIndexPattern() || '',
  //     },
  //     currentDataViewId: dataView?.id,
  //     onAddField: addField,
  //     onDataViewCreated: createNewDataView,
  //     onCreateDefaultAdHocDataView: stateContainer.actions.createAndAppendAdHocDataView,
  //     onChangeDataView: () => {},
  //     textBasedLanguages: supportedTextBasedLanguages,
  //     shouldShowTextBasedLanguageTransitionModal: false,
  //     adHocDataViews,
  //     savedDataViews,
  //     onEditDataView,
  //   };
  // }, []);

  return <CustomSearchBar useDefaultBehaviors={false} appName={APP_ID} {...props} />;
};
