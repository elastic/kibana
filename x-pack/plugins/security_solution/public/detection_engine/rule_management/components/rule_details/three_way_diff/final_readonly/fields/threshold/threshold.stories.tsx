/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { ThresholdReadOnly } from './threshold';
import { FieldReadOnly } from '../../field_readonly';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import { mockThresholdRule } from '../../storybook/mocks';

export default {
  component: ThresholdReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/threshold',
};

interface TemplateProps {
  finalDiffableRule: DiffableRule;
}

const Template: Story<TemplateProps> = (args) => {
  return <FieldReadOnly fieldName="threshold" finalDiffableRule={args.finalDiffableRule} />;
};

export const Default = Template.bind({});

Default.args = {
  finalDiffableRule: mockThresholdRule({
    threshold: {
      field: ['Responses.process.pid'],
      value: 100,
      cardinality: [{ field: 'host.id', value: 2 }],
    },
  }),
};
