/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeneratorFunction, Dataset, IndexTemplateDef } from '../types';
import {
  FAKE_HOSTS,
  FAKE_LOGS,
  FAKE_EC2,
  FAKE_K8S,
  FAKE_APM_LATENCY,
  FAKE_STACK,
} from '../../common/constants';

import * as fakeLogs from './fake_logs';
import * as fakeK8S from './fake_k8s';
import * as fakeHosts from './fake_hosts';
import * as fakeEc2 from './fake_ec2';
import * as fakeApmLatency from './fake_apm_latency';
import * as fakeStack from './fake_stack';

export const templates: Record<Dataset, Record<string, any> | Array<Record<string, any>>> = {
  [FAKE_HOSTS]: [],
  [FAKE_LOGS]: [],
  [FAKE_EC2]: fakeEc2.template,
  [FAKE_K8S]: fakeK8S.template,
  [FAKE_APM_LATENCY]: fakeApmLatency.template,
  [FAKE_STACK]: fakeStack.template,
};

export const indexTemplates: Record<Dataset, IndexTemplateDef[]> = {
  [FAKE_HOSTS]: [fakeHosts.indexTemplate],
  [FAKE_EC2]: [],
  [FAKE_K8S]: [],
  [FAKE_APM_LATENCY]: [],
  [FAKE_LOGS]: [fakeLogs.indexTemplate],
  [FAKE_STACK]: fakeStack.indexTemplate,
};

export const generateEvents: Record<Dataset, GeneratorFunction> = {
  [FAKE_HOSTS]: fakeHosts.generateEvent,
  [FAKE_LOGS]: fakeLogs.generateEvent,
  [FAKE_EC2]: fakeEc2.generateEvent,
  [FAKE_K8S]: fakeK8S.generateEvent,
  [FAKE_APM_LATENCY]: fakeApmLatency.generateEvent,
  [FAKE_STACK]: fakeStack.generteEvent,
};

export const kibanaAssets: Record<Dataset, string[]> = {
  [FAKE_HOSTS]: [],
  [FAKE_LOGS]: [],
  [FAKE_EC2]: [],
  [FAKE_K8S]: [],
  [FAKE_APM_LATENCY]: [],
  [FAKE_STACK]: fakeStack.kibanaAssets,
};
