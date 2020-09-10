/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { ALL } from './constants';
import { ADMIN } from '../../../constants/credentials';
import { IApiToken } from '../../../../../../common/types/app_search';

export const getEnginesDisplayText = (apiToken: IApiToken) => {
  const { type, access_all_engines: accessAll, engines = [] } = apiToken;
  const engineList = () => (
    <ul className="credentials-engine-list">
      {engines.map((engine) => (
        <li key={engine} className="credentials-engine-list__engine">
          {engine}
        </li>
      ))}
    </ul>
  );

  if (type === ADMIN) {
    return '--';
  }
  return accessAll ? ALL : engineList();
};
