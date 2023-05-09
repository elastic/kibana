/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SolutionNav } from '@kbn/shared-ux-page-solution-nav';

export function ObservabilitySideNavigation() {
  return (
    <SolutionNav
      items={[
        {
          id: 'signals',
          name: undefined,
          items: [
            {
              id: 'alerts',
              name: 'Alerts',
            },
            {
              id: 'Cases',
              name: 'Cases',
            },
            {
              id: 'slos',
              name: 'SLOs',
            },
          ],
        },

        {
          id: 'signals',
          name: 'Signals',
          items: [
            {
              id: 'tracing',
              name: 'Tracing',
            },
            {
              id: 'logs',
              name: 'Logs',
            },
          ],
        },

        {
          id: 'toolbox',
          name: 'Toolbox',
          items: [
            {
              id: 'visualization',
              name: 'Visualization',
            },
            {
              id: 'dashboards',
              name: 'Dashboards',
            },
          ],
        },
      ]}
      canBeCollapsed={false}
      name={'Observability'}
      icon={'logoObservability'}
      closeFlyoutButtonPosition={'inside'}
    />
  );
}
