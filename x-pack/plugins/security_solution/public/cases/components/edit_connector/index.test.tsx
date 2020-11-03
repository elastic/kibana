/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { EditConnector } from './index';
import { getFormMock, useFormMock } from '../__mock__/form';
import { TestProviders } from '../../../common/mock';
import { connectorsMock } from '../../containers/configure/mock';
import { waitFor } from '@testing-library/react';
import { caseUserActions } from '../../containers/mock';

jest.mock(
  '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form'
);

const onSubmit = jest.fn();
const defaultProps = {
  connectors: connectorsMock,
  disabled: false,
  isLoading: false,
  onSubmit,
  selectedConnector: 'none',
  caseFields: null,
  userActions: caseUserActions,
};

describe('EditConnector ', () => {
  const sampleConnector = '123';
  const formHookMock = getFormMock({ connectorId: sampleConnector });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    useFormMock.mockImplementation(() => ({ form: formHookMock }));
  });

  it('Renders no connector, and then edit', async () => {
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...defaultProps} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="connector-edit"] button').simulate('click');

    expect(
      wrapper.find(`span[data-test-subj="dropdown-connector-no-connector"]`).last().exists()
    ).toBeTruthy();

    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    wrapper.update();
    wrapper.find('button[data-test-subj="dropdown-connector-resilient-2"]').simulate('click');
    await waitFor(() => wrapper.update());

    expect(wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().exists()).toBeTruthy();
  });

  it('Edit external service on submit', async () => {
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...defaultProps} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="connector-edit"] button').simulate('click');

    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    wrapper.update();
    wrapper.find('button[data-test-subj="dropdown-connector-resilient-2"]').simulate('click');
    wrapper.update();

    expect(wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().exists()).toBeTruthy();

    wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().simulate('click');
    await waitFor(() => expect(onSubmit.mock.calls[0][0]).toBe(sampleConnector));
  });

  it('Revert to initial external service on error', async () => {
    onSubmit.mockImplementation((connector, onSuccess, onError) => {
      onError(new Error('An error has occurred'));
    });
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...defaultProps} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="connector-edit"] button').simulate('click');

    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    wrapper.update();
    wrapper.find('button[data-test-subj="dropdown-connector-resilient-2"]').simulate('click');
    wrapper.update();

    expect(wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().exists()).toBeTruthy();

    wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().simulate('click');
    await waitFor(() => {
      wrapper.update();
      expect(formHookMock.setFieldValue).toHaveBeenCalledWith('connectorId', 'none');
    });
  });

  it('Resets selector on cancel', async () => {
    const props = {
      ...defaultProps,
    };
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...props} />
      </TestProviders>
    );
    wrapper.find('[data-test-subj="connector-edit"] button').simulate('click');

    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    wrapper.update();
    wrapper.find('button[data-test-subj="dropdown-connector-resilient-2"]').simulate('click');
    wrapper.update();

    wrapper.find(`[data-test-subj="edit-connectors-cancel"]`).last().simulate('click');
    await waitFor(() => {
      wrapper.update();
      expect(formHookMock.setFieldValue).toBeCalledWith(
        'connectorId',
        defaultProps.selectedConnector
      );
    });
  });

  it('Renders loading spinner', async () => {
    const props = { ...defaultProps, isLoading: true };
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...props} />
      </TestProviders>
    );
    await waitFor(() =>
      expect(wrapper.find(`[data-test-subj="connector-loading"]`).last().exists()).toBeTruthy()
    );
  });
});
