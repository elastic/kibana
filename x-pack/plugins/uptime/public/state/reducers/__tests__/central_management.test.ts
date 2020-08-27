/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { centralManagementReducer, CentralManagementState } from '../central_management';
import { monitorCmDataNotFound, putMonitorCmData } from '../../actions/central_management';

describe('centralManagementReducer', () => {
  let defaultState: CentralManagementState;

  beforeEach(() => {
    defaultState = {
      agentPolicyPage: {
        items: [],
      },
      isEditFlyoutVisible: false,
      loadingAgentPolicies: false,
      loadingAgentPolicyDetail: false,
      managedIdList: [],
      savingConfiguration: false,
    };
  });

  it('put monitor id in managed list', () => {
    const updatedState = centralManagementReducer(defaultState, putMonitorCmData('a-test-id'));
    expect(updatedState).toMatchInlineSnapshot(`
      Object {
        "agentPolicyPage": Object {
          "items": Array [],
        },
        "isEditFlyoutVisible": false,
        "loadingAgentPolicies": false,
        "loadingAgentPolicyDetail": false,
        "managedIdList": Array [
          "a-test-id",
        ],
        "mode": "create",
        "savingConfiguration": false,
      }
    `);
  });

  it('removes existing item from id list on not found action', () => {
    defaultState.managedIdList = ['old-id'];
    const updatedState = centralManagementReducer(defaultState, monitorCmDataNotFound('old-id'));
    expect(updatedState).toMatchInlineSnapshot(`
      Object {
        "agentPolicyPage": Object {
          "items": Array [],
        },
        "isEditFlyoutVisible": false,
        "loadingAgentPolicies": false,
        "loadingAgentPolicyDetail": false,
        "managedIdList": Array [],
        "mode": "create",
        "savingConfiguration": false,
      }
    `);
  });
});
