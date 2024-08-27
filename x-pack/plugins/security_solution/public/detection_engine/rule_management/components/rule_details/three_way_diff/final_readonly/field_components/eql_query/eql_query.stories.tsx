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
import type { DiffableAllFields } from '../../../../../../../../../common/api/detection_engine';

import { StorybookProviders } from '../../storybook/storybook_providers';
import { EqlQueryReadOnly } from './eql_query';
import { dataSourceWithIndexPatterns, filtersMock } from '../../storybook/mocks';

export default {
  component: EqlQueryReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FinalReadonly/eql_query',
  argTypes: {
    finalDiffableRule: {
      control: 'object',
      description: 'Final value of the diffable rule',
    },
  },
};

interface TemplateProps {
  finalDiffableRule: Partial<DiffableAllFields>;
  kibanaServicesMock?: Record<string, unknown>;
}

const Template: Story<TemplateProps> = (args) => {
  return (
    <StorybookProviders kibanaServicesMock={args.kibanaServicesMock}>
      <FinalReadonly
        fieldName="eql_query"
        finalDiffableRule={args.finalDiffableRule as DiffableAllFields}
      />
    </StorybookProviders>
  );
};

export const Default = Template.bind({});

Default.args = {
  finalDiffableRule: {
    eql_query: {
      query: '*',
      language: 'eql',
      filters: filtersMock,
    },
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
          } as unknown as ConstructorParameters<typeof DataView>[0]);

          return dataView;
        },
      },
    },
  },
};
