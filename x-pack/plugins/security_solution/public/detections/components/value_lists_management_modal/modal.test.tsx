/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../common/mock';
import { ValueListsModal } from './modal';

describe('ValueListsModal', () => {
  it('renders nothing if showModal is false', () => {
    const container = mount(
      <TestProviders>
        <ValueListsModal showModal={false} onClose={jest.fn()} />
      </TestProviders>
    );

    expect(container.find('EuiModal')).toHaveLength(0);
    container.unmount();
  });

  it('renders modal if showModal is true', () => {
    const container = mount(
      <TestProviders>
        <ValueListsModal showModal={true} onClose={jest.fn()} />
      </TestProviders>
    );

    expect(container.find('EuiModal')).toHaveLength(1);
    container.unmount();
  });

  it('calls onClose when modal is closed', () => {
    const onClose = jest.fn();
    const container = mount(
      <TestProviders>
        <ValueListsModal showModal={true} onClose={onClose} />
      </TestProviders>
    );

    container.find('button[data-test-subj="value-lists-modal-close-action"]').simulate('click');

    expect(onClose).toHaveBeenCalled();
    container.unmount();
  });

  it('renders ValueListsForm and ValueListsTable', () => {
    const container = mount(
      <TestProviders>
        <ValueListsModal showModal={true} onClose={jest.fn()} />
      </TestProviders>
    );

    expect(container.find('ValueListsForm')).toHaveLength(1);
    expect(container.find('ValueListsTable')).toHaveLength(1);
    container.unmount();
  });
});
