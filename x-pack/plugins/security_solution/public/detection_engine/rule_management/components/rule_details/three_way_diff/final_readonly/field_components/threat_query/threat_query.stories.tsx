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
import { ThreatQueryReadOnly } from './threat_query';
import {
  dataSourceWithDataView,
  dataSourceWithIndexPatterns,
  inlineKqlQuery,
  mockDataView,
} from '../../storybook/mocks';
import { FinalReadOnlyStorybookProviders } from '../../storybook/final_readonly_storybook_providers';

export default {
  component: ThreatQueryReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FinalReadonly/threat_query',
};

interface TemplateProps {
  finalDiffableRule: Partial<DiffableAllFields>;
  kibanaServicesMock?: Record<string, unknown>;
}

const Template: Story<TemplateProps> = (args) => {
  return (
    <FinalReadOnlyStorybookProviders kibanaServicesMock={args.kibanaServicesMock}>
      <FinalReadOnly
        fieldName="threat_query"
        finalDiffableRule={args.finalDiffableRule as DiffableAllFields}
      />
    </FinalReadOnlyStorybookProviders>
  );
};

export const ThreatQueryWithIndexPatterns = Template.bind({});

ThreatQueryWithIndexPatterns.args = {
  finalDiffableRule: {
    threat_query: inlineKqlQuery,
    data_source: dataSourceWithIndexPatterns,
  },
  kibanaServicesMock: {
    data: {
      dataViews: {
        create: async () => mockDataView(),
      },
    },
  },
};

export const ThreatQueryWithDataView = Template.bind({});

ThreatQueryWithDataView.args = {
  finalDiffableRule: {
    threat_query: inlineKqlQuery,
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
