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

export function APMLink({ path = '', query, ...rest }: Props) {
  const { core } = useApmPluginContext();
  const { search } = useLocation();
  const href = getAPMHref(
    core.http.basePath.prepend(`/app/apm${path}`),
    search,
    query
  );

  return <EuiLink {...rest} href={href} />;
}
