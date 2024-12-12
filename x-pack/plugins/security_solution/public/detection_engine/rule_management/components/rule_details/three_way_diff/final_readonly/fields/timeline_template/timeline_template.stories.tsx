/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { TimelineTemplateReadOnly } from './timeline_template';
import { FieldFinalReadOnly } from '../../field_final_readonly';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import { mockCustomQueryRule } from '../../storybook/mocks';
import { ThreeWayDiffStorybookProviders } from '../../storybook/three_way_diff_storybook_providers';

export default {
  component: TimelineTemplateReadOnly,
  title:
    'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/timeline_template',
};

interface TemplateProps {
  finalDiffableRule: DiffableRule;
}

const Template: Story<TemplateProps> = (args) => {
  return (
    <ThreeWayDiffStorybookProviders
      finalDiffableRule={args.finalDiffableRule}
      fieldName="timeline_template"
    >
      <FieldFinalReadOnly />
    </ThreeWayDiffStorybookProviders>
  );
};

export const Default = Template.bind({});

Default.args = {
  finalDiffableRule: mockCustomQueryRule({
    timeline_template: {
      timeline_title: 'Alerts Involving a Single User Timeline',
      timeline_id: 'some-timeline-id-123',
    },
  }),
};
