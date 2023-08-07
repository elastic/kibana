/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiSpacer } from '@elastic/eui';

import { schema } from '../../../../detections/components/rules/step_schedule_rule/schema';

export interface RuleScheduleSectionProps {
  interval: string;
  lookback: string;
}

export const RuleScheduleSection = ({ interval, lookback }: RuleScheduleSectionProps) => {
  const listItems = [
    { title: schema.interval.label, description: interval },
    { title: schema.from.label, description: lookback }, // TODO: Convert to minutes
  ];

  return (
    <div>
      <EuiSpacer size="m" />
      <EuiDescriptionList type="column" listItems={listItems} />
    </div>
  );
};
