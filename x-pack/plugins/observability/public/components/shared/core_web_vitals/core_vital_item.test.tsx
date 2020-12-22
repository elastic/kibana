/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { Observable } from 'rxjs';
import { IntlProvider } from 'react-intl';

import { CoreStart } from 'src/core/public';
import { createKibanaReactContext } from 'src/plugins/kibana_react/public';

import { CoreVitalItem } from './core_vital_item';

import { NO_DATA } from './translations';

const KibanaReactContext = createKibanaReactContext(({
  uiSettings: { get: () => {}, get$: () => new Observable() },
} as unknown) as Partial<CoreStart>);

describe('CoreVitalItem', () => {
  const value = '0.005';
  const title = 'Cumulative Layout Shift';
  const thresholds = { bad: '0.25', good: '0.1' };
  const loading = false;
  const helpLabel = 'sample help label';

  it('renders if value is truthy', () => {
    const { getByText } = render(
      <IntlProvider locale="en">
        <KibanaReactContext.Provider>
          <CoreVitalItem
            title={title}
            value={value}
            ranks={[85, 10, 5]}
            loading={loading}
            thresholds={thresholds}
            helpLabel={helpLabel}
          />
        </KibanaReactContext.Provider>
      </IntlProvider>
    );

    expect(getByText(title)).toBeInTheDocument();
    expect(getByText(value)).toBeInTheDocument();
    expect(getByText('Good (85%)')).toBeInTheDocument();
    expect(getByText('Needs improvement (10%)')).toBeInTheDocument();
    expect(getByText('Poor (5%)')).toBeInTheDocument();
  });

  it('renders loading state when loading is truthy', () => {
    const { queryByText, getByText } = render(
      <IntlProvider locale="en">
        <KibanaReactContext.Provider>
          <CoreVitalItem
            title={title}
            value={''}
            ranks={[85, 10, 5]}
            loading={true}
            thresholds={thresholds}
            helpLabel={helpLabel}
          />
        </KibanaReactContext.Provider>
      </IntlProvider>
    );

    expect(queryByText(value)).not.toBeInTheDocument();
    expect(getByText('--')).toBeInTheDocument();
  });

  it('renders no data UI if value is falsey and loading is falsey', () => {
    const { getByText } = render(
      <IntlProvider locale="en">
        <KibanaReactContext.Provider>
          <CoreVitalItem
            title={title}
            value={''}
            ranks={[85, 10, 5]}
            loading={loading}
            thresholds={thresholds}
            helpLabel={helpLabel}
          />
        </KibanaReactContext.Provider>
      </IntlProvider>
    );

    expect(getByText(NO_DATA)).toBeInTheDocument();
  });
});
