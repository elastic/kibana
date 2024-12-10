/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { parseDuration } from '@kbn/alerting-plugin/common';
import { type FormSchema, type FormData, UseField } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_schedule_rule/schema';
import type { RuleSchedule } from '../../../../../../../../common/api/detection_engine';
import { ScheduleItem } from '../../../../../../rule_creation/components/schedule_item_form';
import { secondsToDurationString } from '../../../../../../../detections/pages/detection_engine/rules/helpers';

export const ruleScheduleSchema = {
  interval: schema.interval,
  from: schema.from,
} as FormSchema<{
  interval: string;
  from: string;
}>;

const componentProps = {
  minimumValue: 1,
};

export function RuleScheduleEdit(): JSX.Element {
  return (
    <>
      <UseField path="interval" component={ScheduleItem} componentProps={componentProps} />
      <UseField path="from" component={ScheduleItem} componentProps={componentProps} />
    </>
  );
}

export function ruleScheduleDeserializer(defaultValue: FormData) {
  const lookbackSeconds = parseDuration(defaultValue.rule_schedule.lookback) / 1000;
  const lookbackHumanized = secondsToDurationString(lookbackSeconds);

  return {
    interval: defaultValue.rule_schedule.interval,
    from: lookbackHumanized,
  };
}

export function ruleScheduleSerializer(formData: FormData): {
  rule_schedule: RuleSchedule;
} {
  return {
    rule_schedule: {
      interval: formData.interval,
      lookback: formData.from,
    },
  };
}
