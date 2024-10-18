/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryFn } from '@storybook/react';
import { FieldReadOnly } from '../../field_readonly';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import { ThreatQueryReadOnly } from './threat_query';
import {
  dataSourceWithDataView,
  dataSourceWithIndexPatterns,
  inlineKqlQuery,
  mockDataView,
  mockThreatMatchRule,
} from '../../storybook/mocks';
import { ThreeWayDiffStorybookProviders } from '../../storybook/three_way_diff_storybook_providers';

export default {
  component: ThreatQueryReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/threat_query',
};

interface TemplateProps {
  finalDiffableRule: DiffableRule;
  kibanaServicesOverrides?: Record<string, unknown>;
}

const Template: StoryFn<TemplateProps> = (args) => {
  return (
    <ThreeWayDiffStorybookProviders
      kibanaServicesOverrides={args.kibanaServicesOverrides}
      finalDiffableRule={args.finalDiffableRule}
    >
      <FieldReadOnly fieldName="threat_query" />
    </ThreeWayDiffStorybookProviders>
  );
};

export const ThreatQueryWithIndexPatterns = {
  render: Template,

  args: {
    finalDiffableRule: mockThreatMatchRule({
      threat_query: inlineKqlQuery,
      data_source: dataSourceWithIndexPatterns,
    }),
    kibanaServicesOverrides: {
      data: {
        dataViews: {
          create: async () => mockDataView(),
        },
      },
    },
  },
};

export const ThreatQueryWithDataView = {
  render: Template,

  args: {
    finalDiffableRule: mockThreatMatchRule({
      threat_query: inlineKqlQuery,
      data_source: dataSourceWithDataView,
    }),
    kibanaServicesOverrides: {
      data: {
        dataViews: {
          get: async () => mockDataView(),
        },
      },
    },
  },
};
