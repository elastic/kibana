/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';

// Temporary fix for https://github.com/enzymejs/enzyme/issues/2073
export const waitForUpdates = async <P>(wrapper: ReactWrapper<P>) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    wrapper.update();
  });
};
