/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { takeLatest, call } from 'redux-saga/effects';
import { fetchTags } from '../api/tags';
import { fetchEffectFactory } from './fetch_effect';
import { getTags, getTagsSuccess, getTagsFail } from '../actions/tags';
import {
  postMonitorConfig,
  fetchAgentPolicies,
  fetchAgentPolicyDetail,
} from '../api/central_management';
import {
  postMonitorConfig as postMonitorAction,
  getImAgentPolicies,
  getImAgentPoliciesSuccess,
  getImAgentPoliciesFail,
  PostPackagePolicyParams,
  getImAgentPolicyDetail,
  getImAgentPolicyDetailSuccess,
  getImAgentPolicyDetailFail,
} from '../actions/central_management';
import { CENTRAL_CONFIG } from '../../../common/constants';

function* mapFieldsToConfig(fields: PostPackagePolicyParams): any {
  return {
    // TODO: take this as a parameter
    policy_id: fields.agentPolicyId,
    // TODO: take this as a parameter
    description: '',
    enabled: true,
    inputs: [
      {
        enabled: true,
        streams: [
          {
            data_stream: {
              dataset: 'synthetics.monitor',
              type: 'logs',
            },
            enabled: true,
            id: 'synthetics/http-synthetics.monitor',
            vars: {
              name: {
                type: 'text',
                value: fields.name,
              },
              schedule: {
                type: 'text',
                value: fields.schedule,
              },
              urls: {
                type: 'text',
                value: fields.url,
              },
            },
          },
        ],
        type: 'synthetics/http',
      },
    ],
    name: fields.packagePolicyName,
    // TODO: take this as a parameter
    namespace: 'default',
    // TODO: what does this do?
    output_id: '',
    package: {
      name: CENTRAL_CONFIG.PACKAGE_NAME,
      title: CENTRAL_CONFIG.PACKAGE_TITLE,
      version: CENTRAL_CONFIG.CURRENT_PACKAGE_POLICY_VERSION,
    },
  };
}

export function* performImTasks() {
  yield takeLatest(String(getTags), fetchEffectFactory(fetchTags, getTagsSuccess, getTagsFail));
  yield takeLatest(
    String(getImAgentPolicies),
    fetchEffectFactory(fetchAgentPolicies, getImAgentPoliciesSuccess, getImAgentPoliciesFail)
  );
  yield takeLatest(
    String(getImAgentPolicyDetail),
    fetchEffectFactory(
      fetchAgentPolicyDetail,
      getImAgentPolicyDetailSuccess,
      getImAgentPolicyDetailFail
    )
  );
}

export function* performMonitorConfigPost() {
  yield takeLatest(String(postMonitorAction), function* (action: Action<PostPackagePolicyParams>) {
    try {
      const payload = yield mapFieldsToConfig(action.payload);
      yield call(postMonitorConfig, payload);
    } catch (e) {
      console.error(e);
    }
  });
}
