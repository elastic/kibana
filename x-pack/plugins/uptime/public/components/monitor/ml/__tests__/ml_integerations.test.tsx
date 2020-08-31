/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MLIntegrationComponent } from '../ml_integeration';
import { renderWithRouter, shallowWithRouter } from '../../../../lib';
import * as redux from 'react-redux';

describe('ML Integrations', () => {
  beforeEach(() => {
    const spy = jest.spyOn(redux, 'useDispatch');
    spy.mockReturnValue(jest.fn());

    const spy1 = jest.spyOn(redux, 'useSelector');
    spy1.mockReturnValue(true);
  });

  it('shallow renders without errors', () => {
    const wrapper = shallowWithRouter(<MLIntegrationComponent />);
    expect(wrapper).toMatchSnapshot();
  });

  it('renders without errors', () => {
    const wrapper = renderWithRouter(<MLIntegrationComponent />);
    expect(wrapper).toMatchSnapshot();
  });
});
