/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ml } from './ml_api_service';
import { MlServerDefaults, MlServerLimits } from '../../../common/types/ml_server_info';

export interface CloudInfo {
  cloudId: string | null;
  isCloud: boolean;
  isCloudTrial: boolean;
  deploymentId: string | null;
}

let defaults: MlServerDefaults = {
  anomaly_detectors: {},
  datafeeds: {},
};
let limits: MlServerLimits = {};

const cloudInfo: CloudInfo = {
  cloudId: null,
  isCloud: false,
  isCloudTrial: false,
  deploymentId: null,
};

export async function loadMlServerInfo() {
  try {
    const resp = await ml.mlInfo();
    defaults = resp.defaults;
    limits = resp.limits;
    cloudInfo.cloudId = resp.cloudId ?? null;
    cloudInfo.isCloud = resp.cloudId !== undefined;
    cloudInfo.isCloudTrial = resp.isCloudTrial === true;
    cloudInfo.deploymentId = !resp.cloudId ? null : extractDeploymentId(resp.cloudId);

    return { defaults, limits, cloudId: cloudInfo };
  } catch (error) {
    return { defaults, limits, cloudId: cloudInfo };
  }
}

export function getNewJobDefaults(): MlServerDefaults {
  return defaults;
}

export function getNewJobLimits(): MlServerLimits {
  return limits;
}

export function getCloudId(): string | null {
  return cloudInfo.cloudId;
}

export function isCloud(): boolean {
  return cloudInfo.isCloud;
}

export function isCloudTrial(): boolean {
  return cloudInfo.isCloudTrial;
}

export function getCloudDeploymentId(): string | null {
  return cloudInfo.deploymentId;
}

export function extractDeploymentId(cloudId: string) {
  const tempCloudId = cloudId.replace(/^(.+)?:/, '');
  try {
    const matches = atob(tempCloudId).match(/^.+\$(.+)(?=\$)/);
    return matches !== null && matches.length === 2 ? matches[1] : null;
  } catch (error) {
    return null;
  }
}
