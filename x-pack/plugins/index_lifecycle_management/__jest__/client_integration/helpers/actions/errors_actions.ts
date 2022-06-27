/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { TestBed } from '@kbn/test-jest-helpers';
import { Phase } from '../../../../common/types';

const createWaitForValidationAction = (testBed: TestBed) => () => {
  const { component } = testBed;
  act(() => {
    jest.runAllTimers();
  });
  component.update();
};

const createExpectMessagesAction =
  (testBed: TestBed) => (expectedMessages: string[], phase?: Phase) => {
    const { form } = testBed;
    if (phase) {
      expect(form.getErrorsMessages(`${phase}-phase`)).toEqual(expectedMessages);
    } else {
      expect(form.getErrorsMessages()).toEqual(expectedMessages);
    }
  };

export const createErrorsActions = (testBed: TestBed) => {
  const { exists } = testBed;
  return {
    errors: {
      waitForValidation: createWaitForValidationAction(testBed),
      haveGlobalCallout: () => exists('policyFormErrorsCallout'),
      havePhaseCallout: (phase: Phase) => exists(`phaseErrorIndicator-${phase}`),
      expectMessages: createExpectMessagesAction(testBed),
    },
  };
};
