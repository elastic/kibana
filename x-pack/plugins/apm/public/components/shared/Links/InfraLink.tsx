/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import { compact } from 'lodash';
import React from 'react';
import chrome from 'ui/chrome';
import url from 'url';
import { fromQuery } from './url_helpers';

interface InfraQueryParams {
  time?: number;
  from?: number;
  to?: number;
}

interface Props extends EuiLinkAnchorProps {
  path?: string;
  query: InfraQueryParams;
}

const InfraLink: React.FC<Props> = ({ path, query = {}, ...rest }) => {
  const nextSearch = fromQuery(query);
  const href = url.format({
    pathname: chrome.addBasePath('/app/infra'),
    hash: compact([path, nextSearch]).join('?')
  });
  return <EuiLink {...rest} href={href} />;
};

export { InfraLink };
