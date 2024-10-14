/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { FalsePositivesReadOnly } from './false_positives';
import { FieldReadOnly } from '../../field_readonly';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import { mockCustomQueryRule } from '../../storybook/mocks';

export default {
  component: FalsePositivesReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/false_positives',
};

interface TemplateProps {
  finalDiffableRule: DiffableRule;
}

const Template: Story<TemplateProps> = (args) => {
  return <FieldReadOnly fieldName="false_positives" finalDiffableRule={args.finalDiffableRule} />;
};

export const Default = Template.bind({});

Default.args = {
  finalDiffableRule: mockCustomQueryRule({
    false_positives: [
      'WAF rules or rule groups may be deleted by a system or network administrator. Verify whether the user identity, user agent, and/or hostname should be making changes in your environment. Rule deletions by unfamiliar users or hosts should be investigated. If known behavior is causing false positives, it can be exempted from the rule.',
      'Uncommon user command activity can be due to an engineer logging onto a server instance in order to perform manual troubleshooting or reconfiguration.',
    ],
  }),
};
