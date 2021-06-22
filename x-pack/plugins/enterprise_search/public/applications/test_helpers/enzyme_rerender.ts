/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ShallowWrapper } from 'enzyme';

/**
 * Quick and easy helper for re-rendering a React component in Enzyme
 * after (e.g.) updating Kea values
 */
export const rerender = (wrapper: ShallowWrapper) => {
  wrapper.setProps({}); // Re-renders
  wrapper.update(); // Just in case
};
