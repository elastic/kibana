/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../utils/test_helper';
import { CoreVitalItem } from './core_vital_item';
import { NO_DATA } from './translations';

describe('CoreVitalItem', () => {
  const value = '0.005';
  const title = 'Cumulative Layout Shift';
  const thresholds = { bad: '0.25', good: '0.1' };
  const loading = false;
  const helpLabel = 'sample help label';

  it('renders if value is truthy', () => {
    const { getByText } = render(
      <CoreVitalItem
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
      <CoreVitalItem
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
      <CoreVitalItem
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
