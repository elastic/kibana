/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Observable } from 'rxjs';
import { CoreStart } from 'src/core/public';
import { createKibanaReactContext } from '../../../../../../../../src/plugins/kibana_react/public';
import { CoreVitalItem } from '../core_vital_item';
import { LCP_HELP_LABEL, LCP_LABEL } from '../translations';

const KibanaReactContext = createKibanaReactContext({
  uiSettings: { get: () => {}, get$: () => new Observable() },
} as unknown as Partial<CoreStart>);

export default {
  title: 'app/RumDashboard/CoreVitalItem',
  component: CoreVitalItem,
  decorators: [
    (Story: ComponentType) => (
      <IntlProvider locale="en">
        <KibanaReactContext.Provider>
          <Story />
        </KibanaReactContext.Provider>
      </IntlProvider>
    ),
  ],
};

export function NoDataAvailable() {
  return (
    <CoreVitalItem
      thresholds={{ good: '0.1', bad: '0.25' }}
      title={LCP_LABEL}
      value={null}
      loading={false}
      helpLabel={LCP_HELP_LABEL}
    />
  );
}

export function OneHundredPercentGood() {
  return (
    <CoreVitalItem
      thresholds={{ good: '0.1', bad: '0.25' }}
      title={LCP_LABEL}
      value={'0.00s'}
      loading={false}
      ranks={[100, 0, 0]}
      helpLabel={LCP_HELP_LABEL}
    />
  );
}

export function FiftyPercentGood() {
  return (
    <CoreVitalItem
      thresholds={{ good: '0.1', bad: '0.25' }}
      title={LCP_LABEL}
      value={'0.00s'}
      loading={false}
      ranks={[50, 25, 25]}
      helpLabel={LCP_HELP_LABEL}
    />
  );
}

export function OneHundredPercentBad() {
  return (
    <CoreVitalItem
      thresholds={{ good: '0.1', bad: '0.25' }}
      title={LCP_LABEL}
      value={'0.00s'}
      loading={false}
      ranks={[0, 0, 100]}
      helpLabel={LCP_HELP_LABEL}
    />
  );
}

export function OneHundredPercentAverage() {
  return (
    <CoreVitalItem
      thresholds={{ good: '0.1', bad: '0.25' }}
      title={LCP_LABEL}
      value={'0.00s'}
      loading={false}
      ranks={[0, 100, 0]}
      helpLabel={LCP_HELP_LABEL}
    />
  );
}
