/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { TestBed } from '@kbn/test-jest-helpers';

const jsonSelector = 'policyRequestJson';

export const createRequestFlyoutActions = (testBed: TestBed) => {
  const { find, component, exists } = testBed;
  const openRequestFlyout = async () => {
    await act(async () => {
      find('requestButton').simulate('click');
    });
    component.update();
  };
  const closeRequestFlyout = async () => {
    await act(async () => {
      find('policyRequestClose').simulate('click');
    });
    component.update();
  };
  return {
    openRequestFlyout,
    closeRequestFlyout,
    hasRequestJson: () => exists(jsonSelector),
    getRequestJson: () => find(jsonSelector).text(),
    hasInvalidPolicyAlert: () => exists('policyRequestInvalidAlert'),
  };
};
