/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'enzyme';
import { ExplainExporters } from '../exporters';

describe('ExplainExporters', () => {
  test('should explain about xpack.monitoring.exporters setting', () => {
    const component = render(
      <ExplainExporters
        property="xpack.monitoring.exporters"
        data={'myMonitoringClusterExporter1'}
        context="esProd001"
      />
    );
    expect(component).toMatchSnapshot();
  });
});
