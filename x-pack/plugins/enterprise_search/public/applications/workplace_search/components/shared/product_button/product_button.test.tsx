/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { ProductButton } from './';

jest.mock('../../../../shared/telemetry', () => ({
  sendTelemetry: jest.fn(),
  SendAppSearchTelemetry: jest.fn(),
}));
import { sendTelemetry } from '../../../../shared/telemetry';

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
    expect(sendTelemetry).toHaveBeenCalled();
    (sendTelemetry as jest.Mock).mockClear();
  });
});
