/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC } from 'react';
import type { SavedSearch } from '@kbn/discover-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { LogCategorizationPage } from './log_categorization_page';
import {
  // SEARCH_QUERY_LANGUAGE,
  // SearchQueryLanguage,
  SavedSearchSavedObject,
} from '../../application/utils/search_utils';

export interface LogCategorizationAppStateProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** The saved search to analyze. */
  savedSearch: SavedSearch | SavedSearchSavedObject | null;
}

export const LogCategorizationAppState: FC<LogCategorizationAppStateProps> = ({
  dataView,
  savedSearch,
}) => {
  return <LogCategorizationPage dataView={dataView} savedSearch={savedSearch} />;
};
