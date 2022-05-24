/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit, pick } from 'lodash';
import { SavedObject } from '@kbn/core/server';
import { secretKeys } from '../../../common/constants/monitor_management';
import {
  ConfigKey,
  SyntheticsMonitor,
  SyntheticsMonitorWithSecrets,
} from '../../../common/runtime_types/monitor_management';
import { DEFAULT_FIELDS } from '../../../common/constants/monitor_defaults';

export function formatSecrets(monitor: SyntheticsMonitor): SyntheticsMonitorWithSecrets {
  const monitorWithoutSecrets = omit(monitor, secretKeys) as SyntheticsMonitorWithSecrets;
  const secrets = pick(monitor, secretKeys);

  return {
    ...monitorWithoutSecrets,
    secrets: JSON.stringify(secrets),
  };
}

export function normalizeSecrets(
  monitor: SavedObject<SyntheticsMonitorWithSecrets>
): SavedObject<SyntheticsMonitor> {
  const defaultFields = DEFAULT_FIELDS[monitor.attributes[ConfigKey.MONITOR_TYPE]];
  const normalizedMonitor = {
    ...monitor,
    attributes: {
      ...defaultFields,
      ...monitor.attributes,
      ...JSON.parse(monitor.attributes.secrets || ''),
    },
  };
  delete normalizedMonitor.attributes.secrets;
  return normalizedMonitor;
}
