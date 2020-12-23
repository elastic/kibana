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

/* HOC to wrap components in KibanaReact context as well as in18 context.
 * is not opinionated and can be used with enzyme, react testing library or
 * react test renderer */
function withKibanaIntl(WrappedComponent: React.ComponentType<any>) {
  const KibanaReactContext = createKibanaReactContext(({
    uiSettings: { get: () => {}, get$: () => new Observable() },
  } as unknown) as Partial<CoreStart>);

  return (props: any) => (
    <IntlProvider locale="en">
      <KibanaReactContext.Provider>
        <WrappedComponent {...props} />
      </KibanaReactContext.Provider>
    </IntlProvider>
  );
}

const ConnectedCoreVitalItem = withKibanaIntl(CoreVitalItem);

describe('CoreVitalItem', () => {
  const value = '0.005';
  const title = 'Cumulative Layout Shift';
  const thresholds = { bad: '0.25', good: '0.1' };
  const loading = false;
  const helpLabel = 'sample help label';

  it('renders if value is truthy', () => {
    const { getByText } = render(
      <ConnectedCoreVitalItem
        title={title}
        value={value}
        ranks={[85, 10, 5]}
        loading={loading}
        thresholds={thresholds}
        helpLabel={helpLabel}
      />
    );

    expect(getByText(title)).toBeInTheDocument();
    expect(getByText(value)).toBeInTheDocument();
    expect(getByText('Good (85%)')).toBeInTheDocument();
    expect(getByText('Needs improvement (10%)')).toBeInTheDocument();
    expect(getByText('Poor (5%)')).toBeInTheDocument();
  });

  it('renders loading state when loading is truthy', () => {
    const { queryByText, getByText } = render(
      <ConnectedCoreVitalItem
        title={title}
        value={value}
        ranks={[85, 10, 5]}
        loading={true}
        thresholds={thresholds}
        helpLabel={helpLabel}
      />
    );

    expect(queryByText(value)).not.toBeInTheDocument();
    expect(getByText('--')).toBeInTheDocument();
  });

  it('renders no data UI if value is falsey and loading is falsey', () => {
    const { getByText } = render(
      <ConnectedCoreVitalItem
        title={title}
        value={null}
        ranks={[85, 10, 5]}
        loading={loading}
        thresholds={thresholds}
        helpLabel={helpLabel}
      />
    );

    expect(getByText(NO_DATA)).toBeInTheDocument();
  });
});
