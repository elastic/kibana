/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'enzyme';
import { ExplainPluginEnabled } from '../plugin_enabled';

describe('ExplainPluginEnabled', () => {
  test('should explain about xpack.monitoring.enabled setting', () => {
    const component = render(
      <ExplainPluginEnabled
        property="xpack.monitoring.enabled"
        data="false"
        context="cluster"
      />
    );
    expect(component).toMatchSnapshot();
  });
});
