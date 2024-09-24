/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { EventCategoryOverrideReadOnly } from './event_category_override';
import { FieldReadOnly } from '../../field_readonly';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import { mockEqlRule } from '../../storybook/mocks';

export default {
  component: EventCategoryOverrideReadOnly,
  title:
    'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/event_category_override',
};

interface TemplateProps {
  finalDiffableRule: DiffableRule;
}

const Template: Story<TemplateProps> = (args) => {
  return (
    <FieldReadOnly fieldName="event_category_override" finalDiffableRule={args.finalDiffableRule} />
  );
};

export const Default = Template.bind({});

Default.args = {
  finalDiffableRule: mockEqlRule({
    event_category_override: 'event.action',
  }),
};
