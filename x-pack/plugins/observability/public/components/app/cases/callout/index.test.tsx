/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { EuiThemeProvider } from '../../../../../../../../src/plugins/kibana_react/common';
import { useMessagesStorage } from '../../../../hooks/use_messages_storage';
import { createCalloutId } from './helpers';
import { CaseCallOut, CaseCallOutProps } from '.';
import { observabilityAppId } from '../../../../../common';

jest.mock('../../../../hooks/use_messages_storage');
const useSecurityLocalStorageMock = useMessagesStorage as jest.Mock;
const securityLocalStorageMock = {
  getMessages: jest.fn(() => []),
  addMessage: jest.fn(),
};

describe('CaseCallOut ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSecurityLocalStorageMock.mockImplementation(() => securityLocalStorageMock);
  });

  it('renders a callout correctly', () => {
    const props: CaseCallOutProps = {
      title: 'hey title',
      messages: [
        { id: 'message-one', title: 'title', description: <p>{'we have two messages'}</p> },
        { id: 'message-two', title: 'title', description: <p>{'for real'}</p> },
      ],
    };
    const wrapper = mount(
      <EuiThemeProvider>
        <CaseCallOut {...props} />
      </EuiThemeProvider>
    );

    const id = createCalloutId(['message-one', 'message-two']);
    expect(wrapper.find(`[data-test-subj="callout-messages-${id}"]`).last().exists()).toBeTruthy();
  });

  it('groups the messages correctly', () => {
    const props: CaseCallOutProps = {
      title: 'hey title',
      messages: [
        {
          id: 'message-one',
          title: 'title one',
          description: <p>{'we have two messages'}</p>,
          errorType: 'danger',
        },
        { id: 'message-two', title: 'title two', description: <p>{'for real'}</p> },
      ],
    };

    const wrapper = mount(
      <EuiThemeProvider>
        <CaseCallOut {...props} />
      </EuiThemeProvider>
    );

    const idDanger = createCalloutId(['message-one']);
    const idPrimary = createCalloutId(['message-two']);

    expect(
      wrapper.find(`[data-test-subj="case-callout-${idPrimary}"]`).last().exists()
    ).toBeTruthy();
    expect(
      wrapper.find(`[data-test-subj="case-callout-${idDanger}"]`).last().exists()
    ).toBeTruthy();
  });

  it('dismisses the callout correctly', () => {
    const props: CaseCallOutProps = {
      title: 'hey title',
      messages: [
        { id: 'message-one', title: 'title', description: <p>{'we have two messages'}</p> },
      ],
    };
    const wrapper = mount(
      <EuiThemeProvider>
        <CaseCallOut {...props} />
      </EuiThemeProvider>
    );

    const id = createCalloutId(['message-one']);

    expect(wrapper.find(`[data-test-subj="case-callout-${id}"]`).last().exists()).toBeTruthy();
    wrapper.find(`[data-test-subj="callout-dismiss-${id}"]`).last().simulate('click');
    expect(wrapper.find(`[data-test-subj="case-callout-${id}"]`).exists()).toBeFalsy();
  });

  it('persist the callout of type primary when dismissed', () => {
    const props: CaseCallOutProps = {
      title: 'hey title',
      messages: [
        { id: 'message-one', title: 'title', description: <p>{'we have two messages'}</p> },
      ],
    };

    const wrapper = mount(
      <EuiThemeProvider>
        <CaseCallOut {...props} />
      </EuiThemeProvider>
    );

    const id = createCalloutId(['message-one']);
    expect(securityLocalStorageMock.getMessages).toHaveBeenCalledWith(observabilityAppId);
    wrapper.find(`[data-test-subj="callout-dismiss-${id}"]`).last().simulate('click');
    expect(securityLocalStorageMock.addMessage).toHaveBeenCalledWith(observabilityAppId, id);
  });

  it('do not show the callout if is in the localStorage', () => {
    const props: CaseCallOutProps = {
      title: 'hey title',
      messages: [
        { id: 'message-one', title: 'title', description: <p>{'we have two messages'}</p> },
      ],
    };

    const id = createCalloutId(['message-one']);

    useSecurityLocalStorageMock.mockImplementation(() => ({
      ...securityLocalStorageMock,
      getMessages: jest.fn(() => [id]),
    }));

    const wrapper = mount(
      <EuiThemeProvider>
        <CaseCallOut {...props} />
      </EuiThemeProvider>
    );

    expect(wrapper.find(`[data-test-subj="case-callout-${id}"]`).last().exists()).toBeFalsy();
  });

  it('do not persist a callout of type danger', () => {
    const props: CaseCallOutProps = {
      title: 'hey title',
      messages: [
        {
          id: 'message-one',
          title: 'title one',
          description: <p>{'we have two messages'}</p>,
          errorType: 'danger',
        },
      ],
    };

    const wrapper = mount(
      <EuiThemeProvider>
        <CaseCallOut {...props} />
      </EuiThemeProvider>
    );

    const id = createCalloutId(['message-one']);
    wrapper.find(`button[data-test-subj="callout-dismiss-${id}"]`).simulate('click');
    wrapper.update();
    expect(securityLocalStorageMock.addMessage).not.toHaveBeenCalled();
  });

  it('do not persist a callout of type warning', () => {
    const props: CaseCallOutProps = {
      title: 'hey title',
      messages: [
        {
          id: 'message-one',
          title: 'title one',
          description: <p>{'we have two messages'}</p>,
          errorType: 'warning',
        },
      ],
    };

    const wrapper = mount(
      <EuiThemeProvider>
        <CaseCallOut {...props} />
      </EuiThemeProvider>
    );

    const id = createCalloutId(['message-one']);
    wrapper.find(`button[data-test-subj="callout-dismiss-${id}"]`).simulate('click');
    wrapper.update();
    expect(securityLocalStorageMock.addMessage).not.toHaveBeenCalled();
  });

  it('do not persist a callout of type success', () => {
    const props: CaseCallOutProps = {
      title: 'hey title',
      messages: [
        {
          id: 'message-one',
          title: 'title one',
          description: <p>{'we have two messages'}</p>,
          errorType: 'success',
        },
      ],
    };

    const wrapper = mount(
      <EuiThemeProvider>
        <CaseCallOut {...props} />
      </EuiThemeProvider>
    );

    const id = createCalloutId(['message-one']);
    wrapper.find(`button[data-test-subj="callout-dismiss-${id}"]`).simulate('click');
    wrapper.update();
    expect(securityLocalStorageMock.addMessage).not.toHaveBeenCalled();
  });
});
