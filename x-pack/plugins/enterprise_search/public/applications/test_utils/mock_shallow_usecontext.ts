/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * NOTE: This variable name MUST start with 'mock*' in order for
 * Jest to accept its use within a jest.mock()
 */
import { mockKibanaContext } from './mock_kibana_context';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(() => mockKibanaContext),
}));

/**
 * Example usage within a component test using shallow():
 *
 * import '../../../test_utils/mock_shallow_usecontext'; // Must come before React's import, adjust relative path as needed
 *
 * import React from 'react';
 * import { shallow } from 'enzyme';
 *
 * // ... etc.
 */

/**
 * If you need to override the default mock context values, you can do so via jest.mockImplementation:
 *
 * import React, { useContext } from 'react';
 *
 * // ... etc.
 *
 * it('some test', () => {
 *   useContext.mockImplementationOnce(() => ({ enterpriseSearchUrl: 'someOverride' }));
 * });
 */
