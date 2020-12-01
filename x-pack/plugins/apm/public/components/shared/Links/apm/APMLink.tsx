/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import { IBasePath } from 'kibana/public';
import { pick } from 'lodash';
import React from 'react';
import { useLocation } from 'react-router-dom';
import url from 'url';
import { pickKeys } from '../../../../../common/utils/pick_keys';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { APMQueryParams, fromQuery, toQuery } from '../url_helpers';

interface Props extends EuiLinkAnchorProps {
  path?: string;
  query?: APMQueryParams;
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
];

/**
 * Hook to get a link for a path with persisted filters
 */
export function useAPMHref(
  path: string,
  persistentFilters: Array<keyof APMQueryParams> = PERSISTENT_APM_PARAMS
) {
  const { urlParams } = useUrlParams();
  const { basePath } = useApmPluginContext().core.http;
  const { search } = useLocation();
  const query = pickKeys(urlParams as APMQueryParams, ...persistentFilters);

  return getAPMHref({ basePath, path, query, search });
}

/**
 * Get an APM link for a path.
 */
export function getAPMHref({
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

export function APMLink({ path = '', query, ...rest }: Props) {
  const { core } = useApmPluginContext();
  const { search } = useLocation();
  const { basePath } = core.http;
  const href = getAPMHref({ basePath, path, search, query });

  return <EuiLink {...rest} href={href} />;
}
