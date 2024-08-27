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
import { ThreatQueryReadOnly } from './threat_query';
import { dataSourceWithDataView, inlineKqlQuery } from '../../storybook/mocks';
import { StorybookProviders } from '../../storybook/storybook_providers';

type DataViewDeps = ConstructorParameters<typeof DataView>[0];

export default {
  component: ThreatQueryReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FinalReadonly/threat_query',
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
        fieldName="threat_query"
        finalDiffableRule={args.finalDiffableRule as DiffableAllFields}
      />
    </StorybookProviders>
  );
};

export const Default = Template.bind({});

Default.args = {
  finalDiffableRule: {
    threat_query: inlineKqlQuery,
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
