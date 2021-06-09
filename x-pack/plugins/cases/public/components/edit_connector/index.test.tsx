/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { EditConnector, EditConnectorProps } from './index';
import { getFormMock, useFormMock } from '../__mock__/form';
import { TestProviders } from '../../common/mock';
import { connectorsMock } from '../../containers/configure/mock';
import { caseUserActions } from '../../containers/mock';
import { useKibana } from '../../common/lib/kibana';

jest.mock('../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form');
jest.mock('../../common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const onSubmit = jest.fn();
const defaultProps: EditConnectorProps = {
  connectors: connectorsMock,
  userCanCrud: true,
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
    useFormMock.mockImplementation(() => ({ form: formHookMock }));
    useKibanaMock().services.triggersActionsUi.actionTypeRegistry.get = jest.fn().mockReturnValue({
      actionTypeTitle: '.servicenow',
      iconClass: 'logoSecurity',
    });
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

  it('does not allow the connector to be edited when the user does not have write permissions', async () => {
    const props = { ...defaultProps, userCanCrud: false };
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...props} />
      </TestProviders>
    );
    await waitFor(() =>
      expect(wrapper.find(`[data-test-subj="connector-edit"]`).exists()).toBeFalsy()
    );
  });
});
