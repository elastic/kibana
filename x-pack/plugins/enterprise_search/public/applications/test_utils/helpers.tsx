/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { KibanaContext } from '..';

export const mountWithKibanaContext = (node, contextProps) => {
  return mount(
    <KibanaContext.Provider
      value={{
        http: {},
        setBreadcrumbs: jest.fn(),
        enterpriseSearchUrl: 'http://localhost:3002',
        ...contextProps,
      }}
    >
      {node}
    </KibanaContext.Provider>
  );
};
