/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import { pick } from 'lodash';
import React from 'react';
import url from 'url';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { useLocation } from '../../../../hooks/useLocation';
import { APMQueryParams, fromQuery, toQuery } from '../url_helpers';

interface Props extends EuiLinkAnchorProps {
  path?: string;
  query?: APMQueryParams;
  children?: React.ReactNode;
}

export type APMLinkExtendProps = Omit<Props, 'path'>;

export const PERSISTENT_APM_PARAMS = [
  'kuery',
  'rangeFrom',
  'rangeTo',
  'refreshPaused',
  'refreshInterval',
  'environment',
];

/**
 * Get an APM link for a path. This function does not prepend the basepath so
 * you'll need to do that when calling this.
 */
export function getAPMHref(
  path: string,
  currentSearch: string,
  query: APMQueryParams = {}
) {
  const currentQuery = toQuery(currentSearch);
  const nextQuery = {
    ...pick(currentQuery, PERSISTENT_APM_PARAMS),
    ...query,
  };
  const nextSearch = fromQuery(nextQuery);

  return url.format({
    pathname: path,
    search: nextSearch,
  });
}

/**
 * Hook to to get an APM href. This does prepend the basepath and add the search
 * for you.
 */
export function useAPMHref({
  path,
  currentSearch,
  query = {},
}: {
  path: string;
  currentSearch?: string;
  query?: APMQueryParams;
}) {
  const { core } = useApmPluginContext();
  const { search } = useLocation();

  return getAPMHref(
    core.http.basePath.prepend(`/app/apm${path}`),
    currentSearch ?? search,
    query
  );
}

export function APMLink({ path = '', query, ...rest }: Props) {
  const href = useAPMHref({ path, query });

  return <EuiLink {...rest} href={href} />;
}
