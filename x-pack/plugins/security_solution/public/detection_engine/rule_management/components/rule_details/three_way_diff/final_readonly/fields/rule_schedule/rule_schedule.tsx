/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import { parseDuration } from '@kbn/alerting-plugin/common';
import * as i18n from '../../../../translations';
import type { RuleSchedule } from '../../../../../../../../../common/api/detection_engine';
import { AccessibleTimeValue } from '../../../../rule_schedule_section';
import { secondsToDurationString } from '../../../../../../../../detections/pages/detection_engine/rules/helpers';

interface RuleScheduleReadOnlyProps {
  ruleSchedule: RuleSchedule;
}

export function RuleScheduleReadOnly({ ruleSchedule }: RuleScheduleReadOnlyProps) {
  const lookbackSeconds = parseDuration(ruleSchedule.lookback) / 1000;
  const lookbackHumanized = secondsToDurationString(lookbackSeconds);

  return (
    <EuiDescriptionList
      listItems={[
        {
          title: i18n.INTERVAL_FIELD_LABEL,
          description: <AccessibleTimeValue timeValue={ruleSchedule.interval} />,
        },
        {
          title: i18n.FROM_FIELD_LABEL,
          description: <AccessibleTimeValue timeValue={lookbackHumanized} />,
        },
      ]}
    />
  );
}
