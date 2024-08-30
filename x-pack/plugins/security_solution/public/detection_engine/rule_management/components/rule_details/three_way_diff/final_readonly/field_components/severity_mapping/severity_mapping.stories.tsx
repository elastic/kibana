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
import { SeverityMappingReadOnly } from './severity_mapping';

export default {
  component: SeverityMappingReadOnly,
  title:
    'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FinalReadonly/severity_mapping',
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
      fieldName="severity_mapping"
      finalDiffableRule={args.finalDiffableRule as DiffableAllFields}
    />
  );
};

export const Default = Template.bind({});

Default.args = {
  finalDiffableRule: {
    severity_mapping: [
      {
        field: 'event.severity',
        operator: 'equals',
        severity: 'low',
        value: 'not severe',
      },
      {
        field: 'event.severity',
        operator: 'equals',
        severity: 'high',
        value: 'pretty severe',
      },
    ],
  },
};
