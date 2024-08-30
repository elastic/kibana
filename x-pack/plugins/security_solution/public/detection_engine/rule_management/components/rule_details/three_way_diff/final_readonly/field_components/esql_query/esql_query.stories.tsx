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

export default {
  component: FinalReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FinalReadonly/esql_query',
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
      fieldName="esql_query"
      finalDiffableRule={args.finalDiffableRule as DiffableAllFields}
    />
  );
};

export const Default = Template.bind({});

Default.args = {
  finalDiffableRule: {
    esql_query: {
      query: `SELECT user.name, source.ip FROM "logs-*" WHERE event.action = 'user_login' AND event.outcome = 'failure'`,
      language: 'esql',
    },
  },
};
