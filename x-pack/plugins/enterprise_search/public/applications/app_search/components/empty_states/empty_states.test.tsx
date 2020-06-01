/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiEmptyPrompt, EuiButton, EuiCode, EuiLoadingContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { shallowWithIntl } from '../../../__mocks__';

jest.mock('../../utils/get_username', () => ({ getUserName: jest.fn() }));
import { getUserName } from '../../utils/get_username';

jest.mock('../../../shared/telemetry', () => ({
  sendTelemetry: jest.fn(),
  SendAppSearchTelemetry: jest.fn(),
}));
import { sendTelemetry } from '../../../shared/telemetry';

import { ErrorState, NoUserState, EmptyState, LoadingState } from './';

describe('ErrorState', () => {
  it('renders', () => {
    const wrapper = shallow(<ErrorState />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });
});

describe('NoUserState', () => {
  it('renders', () => {
    const wrapper = shallow(<NoUserState />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });

  it('renders with username', () => {
    getUserName.mockImplementationOnce(() => 'dolores-abernathy');
    const wrapper = shallowWithIntl(<NoUserState />);
    const prompt = wrapper.find(EuiEmptyPrompt).dive();
    const description1 = prompt.find(FormattedMessage).at(1).dive();

    expect(description1.find(EuiCode).prop('children')).toContain('dolores-abernathy');
  });
});

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
    sendTelemetry.mockClear();
  });
});

describe('LoadingState', () => {
  it('renders', () => {
    const wrapper = shallow(<LoadingState />);

    expect(wrapper.find(EuiLoadingContent)).toHaveLength(2);
  });
});
