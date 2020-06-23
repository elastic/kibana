/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { useMessagesStorage } from '../../../common/containers/local_storage/use_messages_storage';
import { TestProviders } from '../../../common/mock';
import { createCalloutId } from './helpers';
import { CaseCallOut } from '.';

jest.mock('../../../common/containers/use_messages_storage');

const useSecurityLocalStorageMock = useMessagesStorage as jest.Mock;
const securityLocalStorageMock = {
  getMessages: jest.fn(() => []),
  addMessage: jest.fn(),
};

const defaultProps = {
  title: 'hey title',
};

describe('CaseCallOut ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSecurityLocalStorageMock.mockImplementation(() => securityLocalStorageMock);
  });

  it('Renders single message callout', () => {
    const props = {
      ...defaultProps,
      message: 'we have one message',
    };

    const wrapper = mount(
      <TestProviders>
        <CaseCallOut {...props} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="callout-message-primary"]`).last().exists()).toBeTruthy();
  });

  it('Renders multi message callout', () => {
    const props = {
      ...defaultProps,
      message: 'we have one message',
      messages: [
        { id: 'message-one', title: 'title', description: <p>{'we have two messages'}</p> },
        { id: 'message-two', title: 'title', description: <p>{'for real'}</p> },
      ],
    };
    const wrapper = mount(
      <TestProviders>
        <CaseCallOut {...props} />
      </TestProviders>
    );

    const id = createCalloutId(['message-one', 'message-two', 'generic-message-error']);

    expect(wrapper.find(`[data-test-subj="callout-messages-${id}"]`).last().exists()).toBeTruthy();
  });

  it('shows the correct type of callouts', () => {
    const props = {
      ...defaultProps,
      messages: [
        {
          id: 'message-one',
          title: 'title one',
          description: <p>{'we have two messages'}</p>,
          errorType: 'danger' as 'primary' | 'success' | 'warning' | 'danger',
        },
        { id: 'message-two', title: 'title two', description: <p>{'for real'}</p> },
      ],
    };

    const wrapper = mount(
      <TestProviders>
        <CaseCallOut {...props} />
      </TestProviders>
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

  it('Dismisses callout', () => {
    const props = {
      ...defaultProps,
      message: 'we have one message',
    };
    const wrapper = mount(
      <TestProviders>
        <CaseCallOut {...props} />
      </TestProviders>
    );

    const id = createCalloutId(['generic-message-error']);

    expect(wrapper.find(`[data-test-subj="case-callout-${id}"]`).last().exists()).toBeTruthy();
    wrapper.find(`[data-test-subj="callout-dismiss-${id}"]`).last().simulate('click');
    expect(wrapper.find(`[data-test-subj="case-callout-${id}"]`).exists()).toBeFalsy();
  });

  it('persist the callout when dismissed', () => {
    const props = {
      ...defaultProps,
      message: 'we have one message',
    };

    const wrapper = mount(
      <TestProviders>
        <CaseCallOut {...props} />
      </TestProviders>
    );

    const id = createCalloutId(['generic-message-error']);
    expect(securityLocalStorageMock.getMessages).toHaveBeenCalledWith('case');
    wrapper.find(`[data-test-subj="callout-dismiss-${id}"]`).last().simulate('click');
    expect(securityLocalStorageMock.addMessage).toHaveBeenCalledWith('case', id);
  });

  it('do not show the callout if is in the localStorage', () => {
    const props = {
      ...defaultProps,
      message: 'we have one message',
    };

    const id = createCalloutId(['generic-message-error']);

    useSecurityLocalStorageMock.mockImplementation(() => ({
      ...securityLocalStorageMock,
      getMessages: jest.fn(() => [id]),
    }));

    const wrapper = mount(
      <TestProviders>
        <CaseCallOut {...props} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="case-callout-${id}"]`).last().exists()).toBeFalsy();
  });

  it('do not persist a callout of type danger', () => {
    const props = {
      ...defaultProps,
      messages: [
        {
          id: 'message-one',
          title: 'title one',
          description: <p>{'we have two messages'}</p>,
          errorType: 'danger' as 'primary' | 'success' | 'warning' | 'danger',
        },
      ],
    };

    mount(
      <TestProviders>
        <CaseCallOut {...props} />
      </TestProviders>
    );

    expect(securityLocalStorageMock.addMessage).not.toHaveBeenCalled();
  });

  it('do not persist a callout of type warning', () => {
    const props = {
      ...defaultProps,
      messages: [
        {
          id: 'message-one',
          title: 'title one',
          description: <p>{'we have two messages'}</p>,
          errorType: 'warning' as 'primary' | 'success' | 'warning' | 'danger',
        },
      ],
    };

    mount(
      <TestProviders>
        <CaseCallOut {...props} />
      </TestProviders>
    );

    expect(securityLocalStorageMock.addMessage).not.toHaveBeenCalled();
  });

  it('do not persist a callout of type success', () => {
    const props = {
      ...defaultProps,
      messages: [
        {
          id: 'message-one',
          title: 'title one',
          description: <p>{'we have two messages'}</p>,
          errorType: 'success' as 'primary' | 'success' | 'warning' | 'danger',
        },
      ],
    };

    mount(
      <TestProviders>
        <CaseCallOut {...props} />
      </TestProviders>
    );

    expect(securityLocalStorageMock.addMessage).not.toHaveBeenCalled();
  });
});
