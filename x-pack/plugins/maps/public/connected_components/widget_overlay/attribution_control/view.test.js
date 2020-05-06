/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { AttributionControl } from './view';

describe('AttributionControl', () => {
  test('is rendered', async () => {
    const mockLayer1 = {
      getAttributions: async () => {
        return [{ url: '', label: 'attribution with no link' }];
      },
    };
    const mockLayer2 = {
      getAttributions: async () => {
        return [{ url: 'https://coolmaps.com', label: 'attribution with link' }];
      },
    };
    const component = shallowWithIntl(<AttributionControl layerList={[mockLayer1, mockLayer2]} />);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });
});
