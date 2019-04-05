/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import React from 'react';
import url from 'url';
import { useLocation } from '../../../hooks/useLocation';
import { APMQueryParams, getSearchWithCurrentTimeRange } from './url_helpers';

interface Props extends EuiLinkAnchorProps {
  path?: string;
  query?: APMQueryParams;
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
