/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl } from 'test_utils/enzyme_helpers';
import { ReasonFound } from '../';

const enabler = {};

describe('ReasonFound', () => {
  test('should load ExplainCollectionInterval component', () => {
    const component = renderWithIntl(
      <ReasonFound
        reason={{
          property: 'xpack.monitoring.collection.interval',
          data: '-1',
          context: 'cluster',
        }}
        enabler={enabler}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('should load ExplainExporters component', () => {
    const component = renderWithIntl(
      <ReasonFound
        reason={{
          property: 'xpack.monitoring.exporters',
          data: 'myMonitoringClusterExporter1',
          context: 'node001foo',
        }}
        enabler={enabler}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('should load ExplainExportersCloud component', () => {
    const component = renderWithIntl(
      <ReasonFound
        reason={{
          property: 'xpack.monitoring.exporters.cloud_enabled',
          data: 'false',
          context: 'fakeContext',
        }}
        enabled={enabler}
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('should load ExplainPluginEnabled component', () => {
    const component = renderWithIntl(
      <ReasonFound
        reason={{
          property: 'xpack.monitoring.enabled',
          data: 'false',
          context: 'node001foo',
        }}
        enabler={enabler}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
