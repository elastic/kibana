/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { RuleExecutionEventType } from '../../../../../../../common/detection_engine/rule_monitoring';
import { assertUnreachable } from '../../../../../../../common/utility_types';

import * as i18n from './translations';

export const getBadgeIcon = (type: RuleExecutionEventType): IconType => {
  switch (type) {
    case RuleExecutionEventType.message:
      return 'console';
    case RuleExecutionEventType['status-change']:
      return 'dot';
    case RuleExecutionEventType['execution-metrics']:
      return 'gear';
    default:
      return assertUnreachable(type, 'Unknown rule execution event type');
  }
};

export const getBadgeText = (type: RuleExecutionEventType): string => {
  switch (type) {
    case RuleExecutionEventType.message:
      return i18n.TYPE_MESSAGE;
    case RuleExecutionEventType['status-change']:
      return i18n.TYPE_STATUS_CHANGE;
    case RuleExecutionEventType['execution-metrics']:
      return i18n.TYPE_EXECUTION_METRICS;
    default:
      return assertUnreachable(type, 'Unknown rule execution event type');
  }
};
