/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../common/mock';
import { createCalloutId } from './helpers';
import { CaseCallOut, CaseCallOutProps } from '.';

describe('CaseCallOut ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps: CaseCallOutProps = {
    hasConnectors: true,
    messages: [
      { id: 'message-one', title: 'title', description: <p>{'we have two messages'}</p> },
      { id: 'message-two', title: 'title', description: <p>{'for real'}</p> },
    ],
    onEditClick: jest.fn(),
    hasLicenseError: false,
  };

  it('renders a callout correctly', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseCallOut {...defaultProps} />
      </TestProviders>
    );

    const id = createCalloutId(['message-one', 'message-two']);
    expect(wrapper.find(`[data-test-subj="callout-messages-${id}"]`).last().exists()).toBeTruthy();
  });

  it('groups the messages correctly', () => {
    const props: CaseCallOutProps = {
      ...defaultProps,
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

  it('Opens edit connectors when hasConnectors=true', () => {
    const wrapper = mount(
      <TestProviders>
        <CaseCallOut {...defaultProps} />
      </TestProviders>
    );

    const id = createCalloutId(['message-one', 'message-two']);
    wrapper.find(`[data-test-subj="callout-onclick-${id}"]`).last().simulate('click');
    expect(defaultProps.onEditClick).toHaveBeenCalled();
  });

  it('Redirects to configure page when hasConnectors=false', () => {
    const props = {
      ...defaultProps,
      hasConnectors: false,
    };
    const wrapper = mount(
      <TestProviders>
        <CaseCallOut {...props} />
      </TestProviders>
    );

    const id = createCalloutId(['message-one', 'message-two']);
    wrapper.find(`[data-test-subj="callout-onclick-${id}"]`).last().simulate('click');
    expect(defaultProps.onEditClick).not.toHaveBeenCalled();
  });
});
