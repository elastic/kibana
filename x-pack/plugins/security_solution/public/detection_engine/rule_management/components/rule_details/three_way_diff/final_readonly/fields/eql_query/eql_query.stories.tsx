/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { FieldReadOnly } from '../../field_readonly';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import { ThreeWayDiffStorybookProviders } from '../../storybook/three_way_diff_storybook_providers';
import { EqlQueryReadOnly } from './eql_query';
import {
  dataSourceWithDataView,
  dataSourceWithIndexPatterns,
  eqlQuery,
  mockDataView,
  mockEqlRule,
} from '../../storybook/mocks';

export default {
  component: EqlQueryReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/eql_query',
};

interface TemplateProps {
  finalDiffableRule: DiffableRule;
  kibanaServicesMock?: Record<string, unknown>;
}

const Template: Story<TemplateProps> = (args) => {
  return (
    <ThreeWayDiffStorybookProviders kibanaServicesMock={args.kibanaServicesMock}>
      <FieldReadOnly fieldName="eql_query" finalDiffableRule={args.finalDiffableRule} />
    </ThreeWayDiffStorybookProviders>
  );
};

export const EqlQueryWithIndexPatterns = Template.bind({});

EqlQueryWithIndexPatterns.args = {
  finalDiffableRule: mockEqlRule({
    eql_query: eqlQuery,
    data_source: dataSourceWithIndexPatterns,
  }),
  kibanaServicesMock: {
    data: {
      dataViews: {
        create: async () => mockDataView(),
      },
    },
  },
};

export const EqlQueryWithDataView = Template.bind({});

EqlQueryWithDataView.args = {
  finalDiffableRule: mockEqlRule({
    eql_query: eqlQuery,
    data_source: dataSourceWithDataView,
  }),
  kibanaServicesMock: {
    data: {
      dataViews: {
        get: async () => mockDataView(),
      },
    },
  },
};
