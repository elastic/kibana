/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicLastRunSetters } from '../types';
import { RuleLastRunResults, RuleLastRunService } from './rule_last_run_service';

describe('RuleLastRunService', () => {
  let ruleLastRunService: RuleLastRunService;
  let lastRunSetters: PublicLastRunSetters;

  beforeEach(() => {
    ruleLastRunService = new RuleLastRunService();
    lastRunSetters = ruleLastRunService.getLastRunSetters();
  });

  test('should return empty errors array if no errors were added', () => {
    expect(ruleLastRunService.getLastRunErrors()).toEqual([]);
  });

  test('should return empty warnings array if no warnings were added', () => {
    expect(ruleLastRunService.getLastRunWarnings()).toEqual([]);
  });

  test('should return empty outcome messages array if none were added', () => {
    expect(ruleLastRunService.getLastRunOutcomeMessage()).toEqual('');
  });

  test('should return errors array with added error', () => {
    lastRunSetters.addLastRunError('First error');
    expect(ruleLastRunService.getLastRunErrors()).toEqual(['First error']);
  });

  test('should return warnings array with added warning', () => {
    lastRunSetters.addLastRunWarning('Second warning');
    expect(ruleLastRunService.getLastRunWarnings()).toEqual(['Second warning']);
  });

  test('should return outcome messages array with added outcome message', () => {
    lastRunSetters.setLastRunOutcomeMessage('Third outcome message');
    expect(ruleLastRunService.getLastRunOutcomeMessage()).toEqual('Third outcome message');
  });

  test('should return last run object with added errors, warnings and outcome messages', () => {
    lastRunSetters.addLastRunError('error');
    lastRunSetters.addLastRunWarning('warning');
    lastRunSetters.setLastRunOutcomeMessage('outcome message');
    const expectedLastRun: RuleLastRunResults = {
      errors: ['error'],
      warnings: ['warning'],
      outcomeMessage: 'outcome message',
    };
    expect(ruleLastRunService.getLastRunResults()).toEqual(expectedLastRun);
  });

  test('should return last run object with multiple added errors, warnings and the last outcome messag reported', () => {
    lastRunSetters.addLastRunError('first error');
    lastRunSetters.addLastRunError('second error');
    lastRunSetters.setLastRunOutcomeMessage('first outcome message');
    lastRunSetters.setLastRunOutcomeMessage('second outcome message');
    lastRunSetters.setLastRunOutcomeMessage('last outcome message');
    const expectedLastRun = {
      errors: ['first error', 'second error'],
      warnings: [],
      outcomeMessage: 'last outcome message',
    };
    expect(ruleLastRunService.getLastRunResults()).toEqual(expectedLastRun);
  });
});
