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
import { ThreeWayDiffStorybookProviders } from '../../storybook/three_way_diff_storybook_providers';
import {
  dataSourceWithDataView,
  dataSourceWithIndexPatterns,
  inlineKqlQuery,
  mockDataView,
  mockCustomQueryRule,
  savedKqlQuery,
  savedQueryResponse,
  mockSavedQueryRule,
} from '../../storybook/mocks';

export default {
  component: FieldReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/kql_query',
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
      <FieldReadOnly fieldName="kql_query" />
    </ThreeWayDiffStorybookProviders>
  );
};

export const InlineKqlQueryWithIndexPatterns = {
  render: Template,

  args: {
    finalDiffableRule: mockCustomQueryRule({
      kql_query: inlineKqlQuery,
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

export const InlineKqlQueryWithDataView = {
  render: Template,

  args: {
    finalDiffableRule: mockCustomQueryRule({
      kql_query: inlineKqlQuery,
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

export const InlineKqlQueryWithoutDataSource = {
  render: Template,

  args: {
    finalDiffableRule: mockCustomQueryRule({
      kql_query: inlineKqlQuery,
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

export const SavedKqlQueryWithIndexPatterns = {
  render: Template,

  args: {
    finalDiffableRule: mockSavedQueryRule({
      kql_query: savedKqlQuery,
      data_source: dataSourceWithIndexPatterns,
      type: 'saved_query',
    }),
    kibanaServicesOverrides: {
      data: {
        dataViews: {
          create: async () => mockDataView(),
        },
      },
      http: {
        get: async () => savedQueryResponse,
      },
    },
  },
};

export const SavedKqlQueryWithDataView = {
  render: Template,

  args: {
    finalDiffableRule: mockSavedQueryRule({
      kql_query: savedKqlQuery,
      data_source: dataSourceWithDataView,
      type: 'saved_query',
    }),
    kibanaServicesOverrides: {
      data: {
        dataViews: {
          get: async () => mockDataView(),
        },
      },
      http: {
        get: async () => savedQueryResponse,
      },
    },
  },
};
