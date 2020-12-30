/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ApiTokenTypes, ALL } from '../constants';
import { ApiToken } from '../types';

export const getEnginesDisplayText = (apiToken: ApiToken): JSX.Element | string => {
  const { type, access_all_engines: accessAll, engines = [] } = apiToken;
  if (type === ApiTokenTypes.Admin) {
    return '--';
  }
  if (accessAll) {
    return ALL;
  }
  return (
    <ul>
      {engines.map((engine) => (
        <li key={engine}>{engine}</li>
      ))}
    </ul>
  );
};
