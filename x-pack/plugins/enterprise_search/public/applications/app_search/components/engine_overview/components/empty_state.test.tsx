/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';

jest.mock('../../../../shared/telemetry', () => ({
  sendTelemetry: jest.fn(),
  SendAppSearchTelemetry: jest.fn(),
}));
import { sendTelemetry } from '../../../../shared/telemetry';

import { EmptyState } from './';

describe('EmptyState', () => {
  it('renders', () => {
    const wrapper = shallow(<EmptyState />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });

  it('sends telemetry on create first engine click', () => {
    const wrapper = shallow(<EmptyState />);
    const prompt = wrapper.find(EuiEmptyPrompt).dive();
    const button = prompt.find(EuiButton);

    button.simulate('click');
    expect(sendTelemetry).toHaveBeenCalled();
    (sendTelemetry as jest.Mock).mockClear();
  });
});
