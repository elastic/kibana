/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import { IBasePath } from 'kibana/public';
import { pick } from 'lodash';
import React from 'react';
import { useLocation } from 'react-router-dom';
import url from 'url';
import { pickKeys } from '../../../../../common/utils/pick_keys';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { APMQueryParams, fromQuery, toQuery } from '../url_helpers';

interface Props extends EuiLinkAnchorProps {
  path?: string;
  query?: APMQueryParams;
  mergeQuery?: (query: APMQueryParams) => APMQueryParams;
  children?: React.ReactNode;
}

export type APMLinkExtendProps = Omit<Props, 'path'>;

export const PERSISTENT_APM_PARAMS: Array<keyof APMQueryParams> = [
  'kuery',
  'rangeFrom',
  'rangeTo',
  'refreshPaused',
  'refreshInterval',
  'environment',
  'serviceGroup',
];

/**
 * Hook to get a link for a path with persisted filters
 */
export function useAPMHref({
  path,
  persistedFilters,
  query,
}: {
  path: string;
  persistedFilters?: Array<keyof APMQueryParams>;
  query?: APMQueryParams;
}) {
  const { urlParams } = useLegacyUrlParams();
  const { basePath } = useApmPluginContext().core.http;
  const { search } = useLocation();
  const nextQuery = {
    ...pickKeys(urlParams as APMQueryParams, ...(persistedFilters ?? [])),
    ...query,
  };

  return getLegacyApmHref({ basePath, path, query: nextQuery, search });
}

/**
 * Get an APM link for a path.
 */
export function getLegacyApmHref({
  basePath,
  path = '',
  search,
  query = {},
}: {
  basePath: IBasePath;
  path?: string;
  search?: string;
  query?: APMQueryParams;
}) {
  const currentQuery = toQuery(search);
  const nextQuery = {
    ...pick(currentQuery, PERSISTENT_APM_PARAMS),
    ...query,
  };
  const nextSearch = fromQuery(nextQuery);

  return url.format({
    pathname: basePath.prepend(`/app/apm${path}`),
    search: nextSearch,
  });
}

export function APMLink({ path = '', query, mergeQuery, ...rest }: Props) {
  const { core } = useApmPluginContext();
  const { search } = useLocation();
  const { basePath } = core.http;

  const mergedQuery = mergeQuery ? mergeQuery(query ?? {}) : query;

  const href = getLegacyApmHref({ basePath, path, search, query: mergedQuery });

  return <EuiLink {...rest} href={href} />;
}
