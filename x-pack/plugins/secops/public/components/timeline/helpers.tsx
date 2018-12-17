/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EventsProps } from '../../containers/events';
import { DataProvider } from './data_providers/data_provider';

// TODO: implement boolean logic to combine queries instead of just taking the first provider
export const combineQueries = (
  dataProviders: DataProvider[]
): { queryProps: EventsProps; resParm: string } | null =>
  dataProviders.length
    ? {
        queryProps: dataProviders[0].componentQueryProps as EventsProps,
        resParm: dataProviders[0].componentResultParam,
      }
    : null;

interface CalculateBodyHeightParams {
  /** The the height of the flyout container, which is typically the entire "page", not including the standard Kibana navigation */
  flyoutHeight?: number;
  /** The flyout header typically contains a title and a close button */
  flyoutHeaderHeight?: number;
  /** All non-body timeline content (i.e. the providers drag and drop area, and the column headers)  */
  timelineHeaderHeight?: number;
  /** Footer content that appears below the body (i.e. paging controls) */
  timelineFooterHeight?: number;
}

export const calculateBodyHeight = ({
  flyoutHeight = 0,
  flyoutHeaderHeight = 0,
  timelineHeaderHeight = 0,
  timelineFooterHeight = 0,
}: CalculateBodyHeightParams): number =>
  flyoutHeight - (flyoutHeaderHeight + timelineHeaderHeight + timelineFooterHeight);

/** Returns true if the response indicates data is loading */
export const getIsLoading = (resData: { loading?: boolean }): boolean =>
  resData.loading != null && resData.loading;
