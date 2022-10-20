/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useCallback } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SplitFieldSelector } from './split_field_selector';
import { FunctionPicker } from './function_picker';
import { usePageUrlState } from '../../hooks/use_url_state';
import { SavedSearchSavedObject } from '../../application/utils/search_utils';
import { PageHeader } from '../page_header';
import { ChartComponent } from './chart_component';

export interface ChangePointDetectionPageProps {
  dataView: DataView;
  savedSearch: SavedSearch | SavedSearchSavedObject | null;
}

interface ChangePointDetectionUrlState {
  fn: string;
  splitField: string;
}

export const ChangePointDetectionPage: FC<ChangePointDetectionPageProps> = () => {
  const [urlState, updateUrlState] = usePageUrlState<ChangePointDetectionUrlState>('changePoint');

  const setFn = useCallback(
    (fn: string) => {
      updateUrlState({ fn });
    },
    [updateUrlState]
  );

  const setSplitField = useCallback(
    (splitField: string) => {
      updateUrlState({ splitField });
    },
    [updateUrlState]
  );

  return (
    <div data-test-subj="aiopsChanePointDetectionPage">
      <PageHeader />
      <EuiFlexGroup alignItems={'center'}>
        <EuiFlexItem grow={false}>
          <FunctionPicker value={urlState.fn} onChange={setFn} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SplitFieldSelector value={urlState.splitField} onChange={setSplitField} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <ChartComponent />
    </div>
  );
};
