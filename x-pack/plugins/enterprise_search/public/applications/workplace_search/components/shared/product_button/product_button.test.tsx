/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockTelemetryActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { ProductButton } from '.';

describe('ProductButton', () => {
  it('renders', () => {
    const wrapper = shallow(<ProductButton />);

    expect(wrapper.find(EuiButton)).toHaveLength(1);
    expect(wrapper.find(FormattedMessage)).toHaveLength(1);
  });

  it('sends telemetry on create first engine click', () => {
    const wrapper = shallow(<ProductButton />);
    const button = wrapper.find(EuiButton);

    button.simulate('click');
    expect(mockTelemetryActions.sendWorkplaceSearchTelemetry).toHaveBeenCalled();
  });
});
