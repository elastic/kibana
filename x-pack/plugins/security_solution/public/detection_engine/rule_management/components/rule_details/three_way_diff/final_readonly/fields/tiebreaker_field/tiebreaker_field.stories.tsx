/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { TiebreakerFieldReadOnly } from './tiebreaker_field';
import { FieldReadOnly } from '../../field_readonly';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import { mockEqlRule } from '../../storybook/mocks';

export default {
  component: TiebreakerFieldReadOnly,
  title:
    'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/tiebreaker_field',
};

interface TemplateProps {
  finalDiffableRule: DiffableRule;
}

const Template: Story<TemplateProps> = (args) => {
  return <FieldReadOnly fieldName="tiebreaker_field" finalDiffableRule={args.finalDiffableRule} />;
};

export const Default = Template.bind({});

Default.args = {
  finalDiffableRule: mockEqlRule({
    tiebreaker_field: 'process.name',
  }),
};
