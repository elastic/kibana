/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { SetEnterpriseSearchChrome as SetPageChrome } from '../shared/kibana_chrome';

export const EnterpriseSearch: React.FC = () => {
  return (
    <>
      <SetPageChrome isRoot />
      Hello world
    </>
  );
};
