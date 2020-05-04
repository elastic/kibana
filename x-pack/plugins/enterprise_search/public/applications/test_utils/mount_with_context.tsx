/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { KibanaContext } from '../';
import { mockKibanaContext } from './mock_kibana_context';

/**
 * This helper mounts a component with a set of default KibanaContext,
 * while also allowing custom context to be passed in via a second arg
 *
 * Example usage:
 *
 * const wrapper = mountWithKibanaContext(<Component />, { enterpriseSearchUrl: 'someOverride' });
 */
export const mountWithKibanaContext = (node, contextProps) => {
  return mount(
    <KibanaContext.Provider value={{ ...mockKibanaContext, ...contextProps }}>
      {node}
    </KibanaContext.Provider>
  );
};
