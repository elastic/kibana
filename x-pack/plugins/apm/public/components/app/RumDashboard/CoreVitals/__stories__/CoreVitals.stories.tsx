/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { EuiThemeProvider } from '../../../../../../../observability/public';
import { CoreVitalItem } from '../CoreVitalItem';
import { LCP_LABEL } from '../translations';

storiesOf('app/RumDashboard/WebCoreVitals', module)
  .addDecorator((storyFn) => <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
  .add(
    'Basic',
    () => {
      return (
        <CoreVitalItem
          thresholds={{ good: '0.1', bad: '0.25' }}
          title={LCP_LABEL}
          value={'0.00s'}
          loading={false}
        />
      );
    },
    {
      info: {
        propTables: false,
        source: false,
      },
    }
  )
  .add(
    '50% Good',
    () => {
      return (
        <CoreVitalItem
          thresholds={{ good: '0.1', bad: '0.25' }}
          title={LCP_LABEL}
          value={'0.00s'}
          loading={false}
          ranks={[50, 25, 25]}
        />
      );
    },
    {
      info: {
        propTables: false,
        source: false,
      },
    }
  )
  .add(
    '100% Bad',
    () => {
      return (
        <CoreVitalItem
          thresholds={{ good: '0.1', bad: '0.25' }}
          title={LCP_LABEL}
          value={'0.00s'}
          loading={false}
          ranks={[0, 0, 100]}
        />
      );
    },
    {
      info: {
        propTables: false,
        source: false,
      },
    }
  )
  .add(
    '100% Average',
    () => {
      return (
        <CoreVitalItem
          thresholds={{ good: '0.1', bad: '0.25' }}
          title={LCP_LABEL}
          value={'0.00s'}
          loading={false}
          ranks={[0, 100, 0]}
        />
      );
    },
    {
      info: {
        propTables: false,
        source: false,
      },
    }
  );
