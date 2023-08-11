/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiSpacer, EuiText } from '@elastic/eui';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas';
import { getHumanizedDuration } from '../../../../detections/pages/detection_engine/rules/helpers';
import * as i18n from './translations';

interface IntervalProps {
  interval: string;
}

const Interval = ({ interval }: IntervalProps) => <EuiText>{interval}</EuiText>;

interface FromProps {
  from: string;
  interval: string;
}

const From = ({ from, interval }: FromProps) => (
  <EuiText>{getHumanizedDuration(from, interval)}</EuiText>
);

export interface RuleScheduleSectionProps {
  rule: RuleResponse;
}

export const RuleScheduleSection = ({ rule }: RuleScheduleSectionProps) => {
  const ruleSectionListItems = [
    {
      title: i18n.INTERVAL_FIELD_LABEL,
      description: <Interval interval={rule.interval} />,
    },
    {
      title: i18n.FROM_FIELD_LABEL,
      description: <From from={rule.from} interval={rule.interval} />,
    },
  ];

  return (
    <div>
      <EuiSpacer size="m" />
      <EuiDescriptionList type="column" listItems={ruleSectionListItems} />
    </div>
  );
};
