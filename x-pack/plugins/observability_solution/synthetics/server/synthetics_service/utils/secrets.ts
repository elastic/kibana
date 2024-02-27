/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit, pick } from 'lodash';
import { SavedObject } from '@kbn/core/server';
import { SyntheticsMonitor880 } from '../../saved_objects/migrations/monitors/8.8.0';
import { secretKeys } from '../../../common/constants/monitor_management';
import {
  ConfigKey,
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../../common/runtime_types/monitor_management';
import { DEFAULT_FIELDS } from '../../../common/constants/monitor_defaults';

export function formatSecrets(monitor: SyntheticsMonitor): SyntheticsMonitorWithSecretsAttributes {
  const monitorWithoutSecrets = omit(monitor, secretKeys) as SyntheticsMonitorWithSecretsAttributes;
  const secrets = pick(monitor, secretKeys);

  return {
    ...monitorWithoutSecrets,
    secrets: JSON.stringify(secrets),
  };
}

export function normalizeSecrets(
  monitor: SavedObject<SyntheticsMonitorWithSecretsAttributes | SyntheticsMonitor880>
): SavedObject<SyntheticsMonitor> {
  const attributes = normalizeMonitorSecretAttributes(monitor.attributes);
  const normalizedMonitor = {
    ...monitor,
    attributes,
  };
  return normalizedMonitor;
}

export function normalizeMonitorSecretAttributes(
  monitor: SyntheticsMonitorWithSecretsAttributes | SyntheticsMonitor880
): SyntheticsMonitor {
  const defaultFields = DEFAULT_FIELDS[monitor[ConfigKey.MONITOR_TYPE]];
  const normalizedMonitorAttributes = {
    ...defaultFields,
    ...monitor,
    ...JSON.parse(monitor.secrets || ''),
  };
  delete normalizedMonitorAttributes.secrets;
  return normalizedMonitorAttributes;
}
