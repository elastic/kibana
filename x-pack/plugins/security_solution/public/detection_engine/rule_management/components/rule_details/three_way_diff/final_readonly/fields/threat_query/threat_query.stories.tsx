/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThreatQueryReadOnly } from './threat_query';
import {
  dataSourceWithDataView,
  dataSourceWithIndexPatterns,
  inlineKqlQuery,
  mockDataView,
} from '../../storybook/mocks';
import { ThreeWayDiffStorybookProviders } from '../../storybook/three_way_diff_storybook_providers';

export default {
  component: ThreatQueryReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/threat_query',
};

export const ThreatQueryWithIndexPatterns = () => (
  <ThreeWayDiffStorybookProviders
    kibanaServicesOverrides={{
      data: {
        dataViews: {
          create: async () => mockDataView(),
        },
      },
    }}
  >
    <ThreatQueryReadOnly threatQuery={inlineKqlQuery} dataSource={dataSourceWithIndexPatterns} />
  </ThreeWayDiffStorybookProviders>
);

export const ThreatQueryWithDataView = () => (
  <ThreeWayDiffStorybookProviders
    kibanaServicesOverrides={{
      data: {
        dataViews: {
          get: async () => mockDataView(),
        },
      },
    }}
  >
    <ThreatQueryReadOnly threatQuery={inlineKqlQuery} dataSource={dataSourceWithDataView} />
  </ThreeWayDiffStorybookProviders>
);
