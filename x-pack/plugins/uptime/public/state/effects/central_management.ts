/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLatest, call } from 'redux-saga/effects';
import { fetchTags } from '../api/tags';
import { fetchEffectFactory } from './fetch_effect';
import { getTags, getTagsSuccess, getTagsFail } from '../actions/tags';
import { postMonitorConfig } from '../api/central_management';
import { postMonitorConfig as postMonitorAction } from '../actions/central_management';

interface MonitorConfig {
  configId: string;
  name: string;
  schedule: string;
  url: string;
}

function* mapFieldsToConfig(fields: MonitorConfig): any {
  return {
    // TODO: take this as a parameter
    config_id: fields.configId,
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
    // TODO: take this as a parameter
    name: 'synthetics-test',
    // TODO: take this as a parameter
    namespace: 'default',
    // TODO: what does this do?
    output_id: '',
    package: {
      name: 'synthetics',
      title: 'Elastic Synthetics',
      version: '0.1.2',
    },
  };
}

export function* performImTasks() {
  yield takeLatest(String(getTags), fetchEffectFactory(fetchTags, getTagsSuccess, getTagsFail));
}

export function* performMonitorConfigPost() {
  yield takeLatest(String(postMonitorAction), function* () {
    try {
      const payload = yield mapFieldsToConfig({
        configId: 'ca0bd770-e231-11ea-ac1a-5b05f3ceedeb',
        name: 'my-monitor-2',
        schedule: '30s',
        url: 'http://my-stuff.com',
      });
      yield call(postMonitorConfig, payload);
    } catch (e) {
      console.error(e);
    }
  });
}
