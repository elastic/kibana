/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { takeLatest, call, put, takeEvery } from 'redux-saga/effects';
import { i18n } from '@kbn/i18n';
import { fetchTags } from '../api/tags';
import { fetchEffectFactory } from './fetch_effect';
import { getTags, getTagsSuccess, getTagsFail } from '../actions/tags';
import {
  deleteMonitor,
  postMonitorConfig,
  fetchAgentPolicies,
  fetchAgentPolicyDetail,
  getMonitorCmDetails,
} from '../api/central_management';
import {
  deleteMonitor as deleteMonitorAction,
  postMonitorConfig as postMonitorAction,
  getImAgentPolicies,
  getImAgentPoliciesSuccess,
  getImAgentPoliciesFail,
  PostPackagePolicyParams,
  getImAgentPolicyDetail,
  getImAgentPolicyDetailSuccess,
  getImAgentPolicyDetailFail,
  getMonitorCmData,
  monitorCmDataNotFound,
  postMonitorConfigFail,
  postMonitorConfigSuccess,
  putMonitorCmData,
} from '../actions/central_management';
import { CENTRAL_CONFIG } from '../../../common/constants';
import { kibanaService } from '../kibana_service';

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
              tags: {
                type: 'text',
                value: fields.tags,
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

function* postSuccessMessage(res: any) {
  if (res.success && res.item?.inputs?.[0]?.streams?.[0]?.vars?.name?.value) {
    return i18n.translate('xpack.uptime.centralManagement.successMessage.withDetail', {
      defaultMessage: '{name} saved',
      values: {
        name: res.item.inputs[0].streams[0].vars.name.value,
      },
    });
  }
  return i18n.translate('xpack.uptime.centralManagement.successMessage', {
    defaultMessage: 'Configuration saved',
  });
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
      const postResult = yield call(postMonitorConfig, payload);
      yield put(postMonitorConfigSuccess(postResult));
      kibanaService.core.notifications.toasts.addSuccess(yield postSuccessMessage(postResult));
    } catch (e) {
      kibanaService.core.notifications.toasts.addError(e, {
        title: 'Error saving policy',
      });
      yield put(postMonitorConfigFail(e));
    }
  });
}

function formatDeleteBody(monitorId: string) {
  return {
    packagePolicyIds: [monitorId],
  };
}

function* deleteMonitorMessage(id: string) {
  return i18n.translate('xpack.uptime.centralManagement.deleteMessage', {
    defaultMessage: '{id} deleted',
    values: {
      id,
    },
  });
}

export function* deleteMonitorEffect() {
  yield takeEvery(String(deleteMonitorAction), function* (action: Action<string>) {
    try {
      const result = yield deleteMonitor(formatDeleteBody(action.payload));
      if (result.length && result[0].success === true) {
        kibanaService.core.notifications.toasts.addSuccess(
          // TODO: make nicer message
          yield deleteMonitorMessage(result[0].id)
        );
      } else {
        kibanaService.core.notifications.toasts.addError(
          new Error(`Received negative success response from server.`),
          {
            title: `Deletion of ${result[0].id} failed`,
          }
        );
      }
    } catch (e) {
      kibanaService.core.notifications.toasts.addError(e, {
        title: 'Error deleting monitor',
      });
    }
  });
}

export function* fetchMonitorCmDetails() {
  yield takeLatest(String(getMonitorCmData), function* (action: Action<string>) {
    try {
      // TODO: store the data from the API in the store?
      // const getResult = yield call(getMonitorCmDetails, action.payload);
      yield call(getMonitorCmDetails, action.payload);
      yield put(putMonitorCmData(action.payload));
    } catch (e) {
      if (e.body.statusCode === 404) {
        yield put(monitorCmDataNotFound(action.payload));
      } else {
        throw e;
      }
    }
  });
}
