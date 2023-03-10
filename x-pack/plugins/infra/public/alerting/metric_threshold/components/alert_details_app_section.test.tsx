/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock as mockCoreMock } from '@kbn/core/public/mocks';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { buildMetricThresholdRule } from '../mocks/metric_threshold_rule';
import AlertDetailsAppSection from './alert_details_app_section';

jest.mock('../../../hooks/use_kibana', () => ({
  useKibanaContextForPlugin: () => ({
    services: mockCoreMock.createStart(),
  }),
}));

jest.mock('../../../containers/metrics_source/use_source_via_http', () => ({
  useSourceViaHttp: () => ({
    source: { id: 'default' },
    createDerivedIndexPattern: () => ({ fields: [], title: 'metricbeat-*' }),
  }),
}));

describe('AlertDetailsAppSection', () => {
  const renderComponent = () => {
    return render(
      <IntlProvider locale="en">
        <AlertDetailsAppSection rule={buildMetricThresholdRule()} />
      </IntlProvider>
    );
  };

  it('should render rule data correctly', async () => {
    const result = renderComponent();

    expect((await result.findByTestId('metricThresholdAppSection')).children.length).toBe(3);
  });
});
