/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockKibanaValues, mockTelemetryActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiLinkTo } from '../../../../../shared/react_router_helpers';

import { navigateToEngine, renderEngineLink } from './engine_link_helpers';

describe('navigateToEngine', () => {
  const { navigateToUrl } = mockKibanaValues;
  const { sendAppSearchTelemetry } = mockTelemetryActions;

  it('sends the user to the engine page and triggers a telemetry event', () => {
    navigateToEngine('engine-a');
    expect(navigateToUrl).toHaveBeenCalledWith('/engines/engine-a');
    expect(sendAppSearchTelemetry).toHaveBeenCalledWith({
      action: 'clicked',
      metric: 'engine_table_link',
    });
  });
});

describe('renderEngineLink', () => {
  const { sendAppSearchTelemetry } = mockTelemetryActions;

  it('renders a link to the engine with telemetry', () => {
    const wrapper = shallow(<div>{renderEngineLink('engine-b')}</div>);
    const link = wrapper.find(EuiLinkTo);

    expect(link.prop('to')).toEqual('/engines/engine-b');

    link.simulate('click');
    expect(sendAppSearchTelemetry).toHaveBeenCalledWith({
      action: 'clicked',
      metric: 'engine_table_link',
    });
  });
});
