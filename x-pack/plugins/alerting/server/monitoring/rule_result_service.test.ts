/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicLastRunSetters } from '../types';
import { RuleResultServiceResults, RuleResultService } from './rule_result_service';

describe('RuleResultService', () => {
  let ruleResultService: RuleResultService;
  let lastRunSetters: PublicLastRunSetters;

  beforeEach(() => {
    ruleResultService = new RuleResultService();
    lastRunSetters = ruleResultService.getLastRunSetters();
  });

  test('should return empty errors array if no errors were added', () => {
    expect(ruleResultService.getLastRunErrors()).toEqual([]);
  });

  test('should return empty warnings array if no warnings were added', () => {
    expect(ruleResultService.getLastRunWarnings()).toEqual([]);
  });

  test('should return empty outcome messages array if none were added', () => {
    expect(ruleResultService.getLastRunOutcomeMessage()).toEqual('');
  });

  test('should return errors array with added error', () => {
    lastRunSetters.addLastRunError('First error');
    expect(ruleResultService.getLastRunErrors()).toEqual([
      { message: 'First error', userError: false },
    ]);
  });

  test('should return errors array with added user error', () => {
    lastRunSetters.addLastRunError('First error', true);
    expect(ruleResultService.getLastRunErrors()).toEqual([
      { message: 'First error', userError: true },
    ]);
  });

  test('should return warnings array with added warning', () => {
    lastRunSetters.addLastRunWarning('Second warning');
    expect(ruleResultService.getLastRunWarnings()).toEqual(['Second warning']);
  });

  test('should return outcome messages array with added outcome message', () => {
    lastRunSetters.setLastRunOutcomeMessage('Third outcome message');
    expect(ruleResultService.getLastRunOutcomeMessage()).toEqual('Third outcome message');
  });

  test('should return last run object with added errors, warnings and outcome messages', () => {
    lastRunSetters.addLastRunError('error');
    lastRunSetters.addLastRunWarning('warning');
    lastRunSetters.setLastRunOutcomeMessage('outcome message');
    const expectedLastRun: RuleResultServiceResults = {
      errors: [
        {
          message: 'error',
          userError: false,
        },
      ],
      warnings: ['warning'],
      outcomeMessage: 'outcome message',
    };
    expect(ruleResultService.getLastRunResults()).toEqual(expectedLastRun);
  });

  test('should return last run object with multiple added errors, warnings and the last outcome messag reported', () => {
    lastRunSetters.addLastRunError('first error');
    lastRunSetters.addLastRunError('second error');
    lastRunSetters.setLastRunOutcomeMessage('first outcome message');
    lastRunSetters.setLastRunOutcomeMessage('second outcome message');
    lastRunSetters.setLastRunOutcomeMessage('last outcome message');
    const expectedLastRun = {
      errors: [
        {
          message: 'first error',
          userError: false,
        },
        {
          message: 'second error',
          userError: false,
        },
      ],
      warnings: [],
      outcomeMessage: 'last outcome message',
    };
    expect(ruleResultService.getLastRunResults()).toEqual(expectedLastRun);
  });
});
