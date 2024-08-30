/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { FinalReadOnly } from '../../final_readonly';
import type { DiffableAllFields } from '../../../../../../../../../common/api/detection_engine';
import { ThreatReadOnly } from './threat';

export default {
  component: ThreatReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FinalReadonly/threat',
  argTypes: {
    finalDiffableRule: {
      control: 'object',
      description: 'Final value of the diffable rule',
    },
  },
};

interface TemplateProps {
  finalDiffableRule: Partial<DiffableAllFields>;
}

const Template: Story<TemplateProps> = (args) => {
  return (
    <FinalReadOnly
      fieldName="threat"
      finalDiffableRule={args.finalDiffableRule as DiffableAllFields}
    />
  );
};

export const Default = Template.bind({});

Default.args = {
  finalDiffableRule: {
    threat: [
      {
        framework: 'MITRE ATT&CK',
        tactic: {
          id: 'TA0006',
          name: 'Credential Access',
          reference: 'https://attack.mitre.org/tactics/TA0006/',
        },
        technique: [
          {
            id: 'T1003',
            name: 'OS Credential Dumping',
            reference: 'https://attack.mitre.org/techniques/T1003/',
            subtechnique: [
              {
                id: 'T1003.001',
                name: 'LSASS Memory',
                reference: 'https://attack.mitre.org/techniques/T1003/001/',
              },
            ],
          },
        ],
      },
    ],
  },
};
