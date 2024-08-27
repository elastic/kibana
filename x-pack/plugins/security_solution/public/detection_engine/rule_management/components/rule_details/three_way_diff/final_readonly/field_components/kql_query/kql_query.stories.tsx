/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { DataView } from '@kbn/data-views-plugin/common';
import { FinalReadonly } from '../../final_readonly';
import { KqlQueryType } from '../../../../../../../../../common/api/detection_engine';
import type {
  DiffableAllFields,
  RuleKqlQuery,
} from '../../../../../../../../../common/api/detection_engine';

import { StorybookProviders } from '../../storybook/storybook_providers';
import {
  dataSourceWithDataView,
  dataSourceWithIndexPatterns,
  filtersMock,
  inlineKqlQuery,
} from '../../storybook/mocks';

type DataViewDeps = ConstructorParameters<typeof DataView>[0];

export default {
  component: FinalReadonly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FinalReadonly/kql_query',
  argTypes: {
    finalDiffableRule: {
      control: 'object',
      description: 'Final value of the diffable rule',
    },
  },
};

interface TemplateProps {
  finalDiffableRule: Partial<DiffableAllFields> | { kql_query: RuleKqlQuery };
  kibanaServicesMock?: Record<string, unknown>;
}

const Template: Story<TemplateProps> = (args) => {
  return (
    <StorybookProviders kibanaServicesMock={args.kibanaServicesMock}>
      <FinalReadonly
        fieldName="kql_query"
        finalDiffableRule={args.finalDiffableRule as DiffableAllFields}
      />
    </StorybookProviders>
  );
};

export const InlineKqlQueryWithIndexPatterns = Template.bind({});

InlineKqlQueryWithIndexPatterns.args = {
  finalDiffableRule: {
    kql_query: inlineKqlQuery,
    data_source: dataSourceWithIndexPatterns,
  },
  kibanaServicesMock: {
    data: {
      dataViews: {
        create: async (spec: Record<string, unknown>) => {
          const dataView = new DataView({
            spec: {
              ...spec,
              fields: {
                'Responses.message': {
                  name: 'Responses.message',
                  type: 'string',
                },
              },
            },
          } as unknown as DataViewDeps);

          return dataView;
        },
      },
    },
  },
};

export const InlineKqlQueryWithDataView = Template.bind({});

InlineKqlQueryWithDataView.args = {
  finalDiffableRule: {
    kql_query: inlineKqlQuery,
    data_source: dataSourceWithDataView,
  },
  kibanaServicesMock: {
    data: {
      dataViews: {
        get: async (id: string) => {
          const dataView = new DataView({
            spec: {
              id,
              fields: {
                'Responses.message': {
                  name: 'Responses.message',
                  type: 'string',
                },
              },
            },
          } as unknown as DataViewDeps);

          return dataView;
        },
      },
    },
  },
};

export const SavedKqlQueryWithDataView = Template.bind({});

SavedKqlQueryWithDataView.args = {
  kibanaServicesMock: {
    data: {
      dataViews: {
        get: async (id: string) => {
          const dataView = new DataView({
            spec: {
              id,
              fields: {
                'Responses.message': {
                  name: 'Responses.message',
                  type: 'string',
                },
              },
            },
          } as unknown as DataViewDeps);

          return dataView;
        },
      },
    },
    http: {
      get: async () => {
        const mockedSavedQuery = {
          id: 'fake-saved-query-id',
          attributes: {
            title: 'Fake Saved Query',
            description: '',
            query: { query: '*', language: 'kuery' },
            filters: filtersMock,
          },
          namespaces: ['default'],
        };

        return mockedSavedQuery;
      },
    },
  },
  finalDiffableRule: {
    kql_query: {
      type: KqlQueryType.saved_query,
      saved_query_id: 'fake-saved-query-id',
    },
    data_source: dataSourceWithDataView,
    type: 'saved_query',
  },
};
