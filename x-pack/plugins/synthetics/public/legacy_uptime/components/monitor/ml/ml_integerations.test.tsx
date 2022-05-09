/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MLIntegrationComponent } from './ml_integeration';
import { renderWithRouter, shallowWithRouter } from '../../../lib';
import * as redux from 'react-redux';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';

const core = coreMock.createStart();
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
    const wrapper = renderWithRouter(
      <KibanaContextProvider
        services={{ ...core, triggersActionsUi: { getEditAlertFlyout: jest.fn() } }}
      >
        <MLIntegrationComponent />
      </KibanaContextProvider>
    );
    expect(wrapper).toMatchSnapshot();
  });
});
