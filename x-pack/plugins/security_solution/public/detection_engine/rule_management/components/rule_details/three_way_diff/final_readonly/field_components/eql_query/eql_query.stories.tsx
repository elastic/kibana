/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { FinalReadonly } from '../../final_readonly';
import type { DiffableAllFields } from '../../../../../../../../../common/api/detection_engine';

import { FinalReadOnlyStorybookProviders } from '../../storybook/final_readonly_storybook_providers';
import { EqlQueryReadOnly } from './eql_query';
import {
  dataSourceWithDataView,
  dataSourceWithIndexPatterns,
  eqlQuery,
  mockDataView,
} from '../../storybook/mocks';

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
    <FinalReadOnlyStorybookProviders kibanaServicesMock={args.kibanaServicesMock}>
      <FinalReadonly
        fieldName="eql_query"
        finalDiffableRule={args.finalDiffableRule as DiffableAllFields}
      />
    </FinalReadOnlyStorybookProviders>
  );
};

export const EqlQueryWithIndexPatterns = Template.bind({});

EqlQueryWithIndexPatterns.args = {
  finalDiffableRule: {
    eql_query: eqlQuery,
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

export const EqlQueryWithDataView = Template.bind({});

EqlQueryWithDataView.args = {
  finalDiffableRule: {
    eql_query: eqlQuery,
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
