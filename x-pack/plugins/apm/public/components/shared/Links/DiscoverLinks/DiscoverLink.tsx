/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import chrome from 'ui/chrome';
import url from 'url';
import { useAPMIndexPattern } from '../../../../hooks/useAPMIndexPattern';
import { useLocation } from '../../../../hooks/useLocation';
import { getTimepickerG, risonStringify } from '../rison_helpers';

interface Props {
  query: {
    _a?: {
      index?: string;
      interval?: string;
      query?: {
        language: string;
        query: string;
      };
      sort?: {
        [key: string]: string;
      };
    };
  };
  children: React.ReactNode;
}

export function DiscoverLink({ query = {}, ...rest }: Props) {
  const apmIndexPattern = useAPMIndexPattern();
  const location = useLocation();

  if (!apmIndexPattern.id) {
    return null;
  }

  const risonQuery = {
    _g: getTimepickerG(location.search),
    _a: {
      ...query._a,
      index: apmIndexPattern.id
    }
  };

  const risonSearch = risonStringify(risonQuery);

  const href = url.format({
    pathname: chrome.addBasePath('/app/kibana'),
    hash: `/discover?${risonSearch}`
  });

  return <EuiLink {...rest} href={href} />;
}
