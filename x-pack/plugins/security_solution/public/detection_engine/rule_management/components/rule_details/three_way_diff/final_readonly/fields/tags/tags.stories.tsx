/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { TagsReadOnly } from './tags';
import { FieldReadOnly } from '../../field_readonly';
import type { DiffableAllFields } from '../../../../../../../../../common/api/detection_engine';

export default {
  component: TagsReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/tags',
};

interface TemplateProps {
  finalDiffableRule: Partial<DiffableAllFields>;
}

const Template: Story<TemplateProps> = (args) => {
  return (
    <FieldReadOnly
      fieldName="tags"
      finalDiffableRule={args.finalDiffableRule as DiffableAllFields}
    />
  );
};

export const Default = Template.bind({});

Default.args = {
  finalDiffableRule: {
    tags: ['Elastic', 'Cloud', 'Google Workspace', 'Log Auditing', 'Threat Detection'],
  },
};
