/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { Story } from '@storybook/react';
import { RequiredFieldsReadOnly } from './required_fields';
import { FieldReadOnly } from '../../field_readonly';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import { mockCustomQueryRule } from '../../storybook/mocks';

export default {
  component: RequiredFieldsReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/required_fields',
};

interface TemplateProps {
  finalDiffableRule: DiffableRule;
}

const Template: Story<TemplateProps> = (args) => {
  return <FieldReadOnly fieldName="required_fields" finalDiffableRule={args.finalDiffableRule} />;
};

export const Default = Template.bind({});

Default.args = {
  finalDiffableRule: mockCustomQueryRule({
    required_fields: [
      { name: 'event.kind', type: 'keyword', ecs: true },
      { name: 'event.module', type: 'keyword', ecs: true },
    ],
  }),
};
