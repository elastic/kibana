/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';

import { TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';

import { useAppDependencies } from '../app_dependencies';

type DataViewListTitleIdMap = Record<string, string>;

export const useGetDataViewsTitleIdMap = () => {
  const { data } = useAppDependencies();

  return useQuery<DataViewListTitleIdMap, IHttpFetchError>(
    [TRANSFORM_REACT_QUERY_KEYS.GET_DATA_VIEW_IDS_WITH_TITLE],
    async () => {
      return (await data.dataViews.getIdsWithTitle(true)).reduce<Record<string, string>>(
        (acc, { id, title }) => {
          acc[title] = id;
          return acc;
        },
        {}
      );
    }
  );
};
