/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { SavedSearchSavedObject } from '../../application/utils/search_utils';
import { PageHeader } from '../page_header';
import { ChartComponent } from './chart_component';

export interface ChangePointDetectionPageProps {
  dataView: DataView;
  savedSearch: SavedSearch | SavedSearchSavedObject | null;
}

export const ChangePointDetectionPage: FC<ChangePointDetectionPageProps> = () => {
  return (
    <div data-test-subj="aiopsChanePointDetectionPage">
      <PageHeader />
      <ChartComponent />
    </div>
  );
};
