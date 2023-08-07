/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiSpacer } from '@elastic/eui';
import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';

import { getDescriptionItem } from '../../../../detections/components/rules/description_step';
import type {
  AboutStepRule,
  AboutStepSeverity,
  AboutStepRiskScore,
} from '../../../../detections/pages/detection_engine/rules/types';
import { schema } from '../../../../detections/components/rules/step_about_rule/schema';

export interface RuleAboutSectionProps {
  description: string;
  author: string[];
  severity: AboutStepSeverity;
  riskScore: AboutStepRiskScore;
  ruleNameOverride: string;
  license: string;
  threat: Threats;
}

export const RuleAboutSection = ({
  description,
  author,
  severity,
  riskScore,
  ruleNameOverride,
  license,
  threat,
}: RuleAboutSectionProps) => {
  const data: Partial<AboutStepRule> = {
    description,
    author,
    severity,
    riskScore,
    ruleNameOverride,
    license,
    threat,
  };

  const labels = Object.keys(schema).reduce((result, key) => {
    return { ...result, [key]: schema[key].label };
  }, {});

  const listItems = Object.keys(data).reduce(
    (result, key) => [...result, ...getDescriptionItem(key, labels[key], data)],
    []
  );

  return (
    <div>
      <EuiDescriptionList listItems={[{ title: 'Description', description }]} />
      <EuiSpacer size="m" />
      <EuiDescriptionList type="column" listItems={listItems} />
    </div>
  );
};
