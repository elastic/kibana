/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ServiceMapGroup } from './types';

/**
 * Display name for a closed service group, from the group's kind fields.
 */
export function formatServiceGroupName(group: ServiceMapGroup): string {
  switch (group.kind) {
    case 'savedGroup':
      return group.name;
    case 'attribute':
      return group.value;
    case 'calls':
      return group.busiestService;
    case 'shared':
      return i18n.translate('xpack.apm.serviceMap.serviceGroup.shared', {
        defaultMessage: 'Shared',
      });
    case 'notConnected':
      return i18n.translate('xpack.apm.serviceMap.serviceGroup.notConnected', {
        defaultMessage: 'Not connected',
      });
  }
}
