/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'kibana/server';
import { RawRule } from '../types';
import { getImportWarnings } from './get_import_warnings';

describe('getImportWarnings', () => {
  it('return warning message with total imported rules that have to be enabled', () => {
    const savedObjectRules = [
      {
        id: '1',
        type: 'alert',
        attributes: {
          enabled: true,
          name: 'rule-name1',
          tags: ['tag-1', 'tag-2'],
          alertTypeId: '123',
          consumer: 'alert-consumer',
          schedule: { interval: '1m' },
          actions: [],
          params: {},
          createdBy: 'me',
          updatedBy: 'me',
          apiKey: '4tndskbuhewotw4klrhgjewrt9u',
          apiKeyOwner: 'me',
          throttle: null,
          notifyWhen: 'onActionGroupChange',
          muteAll: false,
          mutedInstanceIds: [],
          executionStatus: {
            status: 'active',
            lastExecutionDate: '2020-08-20T19:23:38Z',
            error: null,
          },
          scheduledTaskId: '2q5tjbf3q45twer',
        },
        references: [],
      },
      {
        id: '2',
        type: 'alert',
        attributes: {
          enabled: true,
          name: 'rule-name2',
          tags: [],
          alertTypeId: '123',
          consumer: 'alert-consumer',
          schedule: { interval: '1m' },
          actions: [],
          params: {},
          createdBy: 'me',
          updatedBy: 'me',
          apiKey: '4tndskbuhewotw4klrhgjewrt9u',
          apiKeyOwner: 'me',
          throttle: null,
          notifyWhen: 'onActionGroupChange',
          muteAll: false,
          mutedInstanceIds: [],
          executionStatus: {
            status: 'pending',
            lastExecutionDate: '2020-08-20T19:23:38Z',
            error: null,
          },
          scheduledTaskId: '123',
        },
        references: [],
      },
    ];
    const warnings = getImportWarnings(savedObjectRules as unknown as Array<SavedObject<RawRule>>);
    expect(warnings[0].message).toBe('2 rules must be enabled after the import.');
  });

  it('return no warning messages if no rules were imported', () => {
    const savedObjectRules = [] as Array<SavedObject<RawRule>>;
    const warnings = getImportWarnings(savedObjectRules as unknown as Array<SavedObject<RawRule>>);
    expect(warnings.length).toBe(0);
  });
});
