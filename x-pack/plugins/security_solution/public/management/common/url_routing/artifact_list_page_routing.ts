/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// FIXME: Remove references to `querystring`
// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';
import { ArtifactListPageUrlParams } from '../../components/artifact_list_page';
import {
  isDefaultOrMissing,
  extractFirstParamValue,
  extractPageSizeNumber,
  extractPageNumber,
} from './utils';
import { MANAGEMENT_DEFAULT_PAGE_SIZE } from '../constants';
import { appendSearch } from '../../../common/components/link_to/helpers';

const SHOW_PARAM_ALLOWED_VALUES: ReadonlyArray<Required<ArtifactListPageUrlParams>['show']> = [
  'edit',
  'create',
];

/**
 * Normalizes the URL search params by dropping any that are either undefined or whose value is
 * equal to the default value.
 * @param urlSearchParams
 */
const normalizeArtifactListPageUrlSearchParams = (
  urlSearchParams: Partial<ArtifactListPageUrlParams> = {}
): Partial<ArtifactListPageUrlParams> => {
  return {
    ...(!isDefaultOrMissing(urlSearchParams.page, 1) ? { page: urlSearchParams.page } : {}),
    ...(!isDefaultOrMissing(urlSearchParams.pageSize, MANAGEMENT_DEFAULT_PAGE_SIZE)
      ? { pageSize: urlSearchParams.pageSize }
      : {}),
    ...(!isDefaultOrMissing(urlSearchParams.show, undefined) ? { show: urlSearchParams.show } : {}),
    ...(!isDefaultOrMissing(urlSearchParams.itemId, undefined)
      ? { itemId: urlSearchParams.itemId }
      : {}),
    ...(!isDefaultOrMissing(urlSearchParams.filter, '') ? { filter: urlSearchParams.filter } : ''),
    ...(!isDefaultOrMissing(urlSearchParams.includedPolicies, '')
      ? { includedPolicies: urlSearchParams.includedPolicies }
      : ''),
  };
};

export const extractArtifactListPageUrlSearchParams = (
  query: querystring.ParsedUrlQuery
): ArtifactListPageUrlParams => {
  const showParamValue = extractFirstParamValue(query, 'show') as ArtifactListPageUrlParams['show'];

  return {
    page: extractPageNumber(query),
    pageSize: extractPageSizeNumber(query),
    includedPolicies: extractFirstParamValue(query, 'includedPolicies'),
    show:
      showParamValue && SHOW_PARAM_ALLOWED_VALUES.includes(showParamValue)
        ? showParamValue
        : undefined,
    itemId: extractFirstParamValue(query, 'itemId'),
  };
};

export const getArtifactListPageUrlPath = (
  /** The path to the desired page that is using the `<ArtifactListPage>` component */
  path: string,
  /** An optional set of url search params. These will be normalized prior to being appended to the url path */
  searchParams: Partial<ArtifactListPageUrlParams> = {}
): string => {
  return `${path}${appendSearch(
    querystring.stringify(normalizeArtifactListPageUrlSearchParams(searchParams))
  )}`;
};
