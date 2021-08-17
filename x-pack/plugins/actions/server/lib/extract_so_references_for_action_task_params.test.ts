/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractSavedObjectReferences } from './extract_so_references_for_action_task_params';

describe('extractSavedObjectReferences()', () => {
  test('correctly extracts action id into references array', () => {
    expect(extractSavedObjectReferences('my-action-id', false)).toEqual({
      actionIdOrRef: 'actionRef',
      references: [
        {
          id: 'my-action-id',
          name: 'actionRef',
          type: 'action',
        },
      ],
    });
  });

  test('correctly extracts related saved object into references array', () => {
    const relatedSavedObjects = [
      {
        id: 'abc',
        type: 'alert',
        typeId: 'ruleTypeA',
      },
      {
        id: 'def',
        type: 'action',
        typeId: 'connectorTypeB',
      },
      {
        id: 'xyz',
        type: 'alert',
        typeId: 'ruleTypeB',
        namespace: 'custom',
      },
    ];

    expect(extractSavedObjectReferences('my-action-id', false, relatedSavedObjects)).toEqual({
      actionIdOrRef: 'actionRef',
      references: [
        {
          id: 'my-action-id',
          name: 'actionRef',
          type: 'action',
        },
        {
          id: 'abc',
          name: 'related_alert_0',
          type: 'alert',
        },
        {
          id: 'def',
          name: 'related_action_1',
          type: 'action',
        },
        {
          id: 'xyz',
          name: 'related_alert_2',
          type: 'alert',
        },
      ],
      relatedSavedObjectRefs: [
        {
          ref: 'related_alert_0',
          type: 'alert',
          typeId: 'ruleTypeA',
        },
        {
          ref: 'related_action_1',
          type: 'action',
          typeId: 'connectorTypeB',
        },
        {
          ref: 'related_alert_2',
          type: 'alert',
          typeId: 'ruleTypeB',
          namespace: 'custom',
        },
      ],
    });
  });

  test('correctly skips extracting action id into references array if action is preconfigured', () => {
    expect(extractSavedObjectReferences('my-action-id', true)).toEqual({
      actionIdOrRef: 'my-action-id',
      references: [],
    });
  });

  test('correctly extracts related saved object into references array if action is preconfigured', () => {
    const relatedSavedObjects = [
      {
        id: 'abc',
        type: 'alert',
        typeId: 'ruleTypeA',
      },
      {
        id: 'def',
        type: 'action',
        typeId: 'connectorTypeB',
      },
      {
        id: 'xyz',
        type: 'alert',
        typeId: 'ruleTypeB',
        namespace: 'custom',
      },
    ];

    expect(extractSavedObjectReferences('my-action-id', true, relatedSavedObjects)).toEqual({
      actionIdOrRef: 'my-action-id',
      references: [
        {
          id: 'abc',
          name: 'related_alert_0',
          type: 'alert',
        },
        {
          id: 'def',
          name: 'related_action_1',
          type: 'action',
        },
        {
          id: 'xyz',
          name: 'related_alert_2',
          type: 'alert',
        },
      ],
      relatedSavedObjectRefs: [
        {
          ref: 'related_alert_0',
          type: 'alert',
          typeId: 'ruleTypeA',
        },
        {
          ref: 'related_action_1',
          type: 'action',
          typeId: 'connectorTypeB',
        },
        {
          ref: 'related_alert_2',
          type: 'alert',
          typeId: 'ruleTypeB',
          namespace: 'custom',
        },
      ],
    });
  });
});
