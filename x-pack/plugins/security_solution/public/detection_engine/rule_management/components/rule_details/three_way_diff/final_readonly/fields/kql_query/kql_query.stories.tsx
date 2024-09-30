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
  kibanaServicesMock?: Record<string, unknown>;
}

const Template: Story<TemplateProps> = (args) => {
  return (
    <ThreeWayDiffStorybookProviders kibanaServicesMock={args.kibanaServicesMock}>
      <FieldReadOnly fieldName="kql_query" finalDiffableRule={args.finalDiffableRule} />
    </ThreeWayDiffStorybookProviders>
  );
};

export const InlineKqlQueryWithIndexPatterns = Template.bind({});

InlineKqlQueryWithIndexPatterns.args = {
  finalDiffableRule: mockCustomQueryRule({
    kql_query: inlineKqlQuery,
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

export const InlineKqlQueryWithDataView = Template.bind({});

InlineKqlQueryWithDataView.args = {
  finalDiffableRule: mockCustomQueryRule({
    kql_query: inlineKqlQuery,
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

export const InlineKqlQueryWithoutDataSource = Template.bind({});

/*
  Filters should still be displayed if no `data_source` is provided.
  Component would fall back to the default index pattern in such case.
*/
InlineKqlQueryWithoutDataSource.args = {
  finalDiffableRule: mockCustomQueryRule({
    kql_query: inlineKqlQuery,
  }),
  kibanaServicesMock: {
    data: {
      dataViews: {
        create: async () => mockDataView(),
      },
    },
  },
};

export const SavedKqlQueryWithIndexPatterns = Template.bind({});

SavedKqlQueryWithIndexPatterns.args = {
  finalDiffableRule: mockSavedQueryRule({
    kql_query: savedKqlQuery,
    data_source: dataSourceWithIndexPatterns,
    type: 'saved_query',
  }),
  kibanaServicesMock: {
    data: {
      dataViews: {
        create: async () => mockDataView(),
      },
    },
    http: {
      get: async () => savedQueryResponse,
    },
  },
};

export const SavedKqlQueryWithDataView = Template.bind({});

SavedKqlQueryWithDataView.args = {
  finalDiffableRule: mockSavedQueryRule({
    kql_query: savedKqlQuery,
    data_source: dataSourceWithDataView,
    type: 'saved_query',
  }),
  kibanaServicesMock: {
    data: {
      dataViews: {
        get: async () => mockDataView(),
      },
    },
    http: {
      get: async () => savedQueryResponse,
    },
  },
};
