/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import chrome from 'ui/chrome';
import url from 'url';
import { useLocation } from '../../../../hooks/useLocation';
import { getTimepickerG, risonStringify, TimepickerG } from '../rison_helpers';

interface MlG {
  ml?: {
    jobIds: string[];
  };
}

interface Props {
  query?: MlG;
  path?: string;
}

const MLLink: React.FC<Props> = ({ children, path = '', query = {} }) => {
  const location = useLocation();

  const risonQuery: MlG & TimepickerG = getTimepickerG(location.search);

  if (query.ml) {
    risonQuery.ml = query.ml;
  }

  const risonSearch = risonStringify({ _g: risonQuery });

  const href = url.format({
    pathname: chrome.addBasePath('/app/ml'),
    hash: `${path}?${risonSearch}`
  });

  return <EuiLink children={children} href={href} />;
};

export { MLLink };
