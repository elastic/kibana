/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { FieldReadOnly } from '../../field_readonly';
import type { DiffableAllFields } from '../../../../../../../../../common/api/detection_engine';
import { ThreeWayDiffStorybookProviders } from '../../storybook/three_way_diff_storybook_providers';
import {
  dataSourceWithDataView,
  dataSourceWithIndexPatterns,
  mockDataView,
} from '../../storybook/mocks';

export default {
  component: FieldReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/data_source',
};

interface TemplateProps {
  finalDiffableRule: Partial<DiffableAllFields>;
  kibanaServicesMock?: Record<string, unknown>;
}

const Template: Story<TemplateProps> = (args) => {
  return (
    <ThreeWayDiffStorybookProviders kibanaServicesMock={args.kibanaServicesMock}>
      <FieldReadOnly
        fieldName="data_source"
        finalDiffableRule={args.finalDiffableRule as DiffableAllFields}
      />
    </ThreeWayDiffStorybookProviders>
  );
};

export const DataSourceWithIndexPatterns = Template.bind({});

DataSourceWithIndexPatterns.args = {
  finalDiffableRule: {
    data_source: dataSourceWithIndexPatterns,
  },
};

export const DataSourceWithDataView = Template.bind({});

DataSourceWithDataView.args = {
  finalDiffableRule: {
    data_source: dataSourceWithDataView,
  },
  kibanaServicesMock: {
    data: {
      dataViews: {
        get: async () => mockDataView(),
      },
    },
  },
};
