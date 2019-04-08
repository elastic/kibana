/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import React from 'react';
import url from 'url';
import { pick } from 'lodash';
import { useLocation } from '../../../hooks/useLocation';
import { APMQueryParams, toQuery, fromQuery } from './url_helpers';
import { TIMEPICKER_DEFAULTS } from '../../../store/urlParams';

interface Props extends EuiLinkAnchorProps {
  path?: string;
  query?: APMQueryParams;
}

export const PERSISTENT_APM_PARAMS = [
  'kuery',
  'rangeFrom',
  'rangeTo',
  'refreshPaused',
  'refreshInterval'
];

function getSearchWithCurrentTimeRange(
  currentSearch: string,
  query: APMQueryParams = {}
) {
  const currentQuery = toQuery(currentSearch);
  const nextQuery = {
    ...TIMEPICKER_DEFAULTS,
    ...pick(currentQuery, PERSISTENT_APM_PARAMS),
    ...query
  };
  return fromQuery(nextQuery);
}

const APMLink: React.FC<Props> = ({ path, query, ...rest }) => {
  const { search } = useLocation();
  const nextSearch = getSearchWithCurrentTimeRange(search, query);
  const href = url.format({
    pathname: '',
    hash: `${path}?${nextSearch}`
  });
  return <EuiLink {...rest} href={href} />;
};

export { APMLink };
