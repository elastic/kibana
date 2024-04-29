/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ID } from '@kbn/security-solution-features/src/constants';
import React from 'react';
import { useGetStatefulQueryBar } from '../use_get_stateful_query_bar';

interface Props {}

export const ESQLTabHeader = (props: Props) => {
  const { CustomStatefulTopNavKqlQueryBar, CustomSearchBar } = useGetStatefulQueryBar();

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

  return (
    <CustomSearchBar
      appName={APP_ID}
      useDefaultBehaviors={true}
      onQuerySubmit={(args) => {
        console.log({ args });
      }}
      onCancel={() => {}}
      isLoading={false}
      query={{
        esql: 'from logs-endpoint.alerts-default | limit 10',
      }}
      dateRangeFrom={'now-5d'}
      dateRangeto={'now'}
    />
  );
};
