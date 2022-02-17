/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed } from '@kbn/test-jest-helpers';
import { Phase } from '../../../../common/types';
import { createFormToggleAndSetValueAction } from './form_toggle_and_set_value_action';

export const createReplicasAction = (testBed: TestBed, phase: Phase) => {
  return {
    setReplicas: createFormToggleAndSetValueAction(
      testBed,
      `${phase}-setReplicasSwitch`,
      `${phase}-selectedReplicaCount`
    ),
  };
};
