/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { RuleExecutionEventType } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { getBadgeIcon, getBadgeText } from './utils';

interface EventTypeIndicatorProps {
  type: RuleExecutionEventType;
}

const EventTypeIndicatorComponent: React.FC<EventTypeIndicatorProps> = ({ type }) => {
  const icon = getBadgeIcon(type);
  const text = getBadgeText(type);

  return (
    <EuiBadge color="hollow" iconType={icon}>
      {text}
    </EuiBadge>
  );
};

export const EventTypeIndicator = React.memo(EventTypeIndicatorComponent);
EventTypeIndicator.displayName = 'EventTypeIndicator';
