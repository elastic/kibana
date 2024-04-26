/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { DataViewListItem } from '@kbn/data-views-plugin/public';

import { TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';

import { useAppDependencies } from '../app_dependencies';

export const useGetDataViewIdsWithTitle = () => {
  const { data } = useAppDependencies();

  return useQuery<DataViewListItem[], IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.GET_DATA_VIEW_IDS_WITH_TITLE],
    async () => await data.dataViews.getIdsWithTitle()
  );
};
