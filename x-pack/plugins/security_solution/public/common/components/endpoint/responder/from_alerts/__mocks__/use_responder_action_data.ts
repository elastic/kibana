/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponderActionData, UseWithResponderActionDataFromAlertProps } from '../../..';

const useWithResponderActionDataFromAlertMock = (
  options: UseWithResponderActionDataFromAlertProps
): ResponderActionData => {
  return {
    handleResponseActionsClick: jest.fn(() => {
      if (options.onClick) {
        options.onClick();
      }
    }),
    isDisabled: false,
    tooltip: null,
  };
};

export { useWithResponderActionDataFromAlertMock as useWithResponderActionDataFromAlert };
