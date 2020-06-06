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
import { wait } from '../../../common/lib/helpers';
import { act } from 'react-dom/test-utils';
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
};

describe('EditConnector ', () => {
  const sampleConnector = '123';
  const formHookMock = getFormMock({ connector: sampleConnector });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    useFormMock.mockImplementation(() => ({ form: formHookMock }));
  });
  it('Renders no connector, and then edit', () => {
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...defaultProps} />
      </TestProviders>
    );

    expect(
      wrapper.find(`span[data-test-subj="dropdown-connector-no-connector"]`).last().exists()
    ).toBeTruthy();

    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    wrapper.update();
    wrapper.find('button[data-test-subj="dropdown-connector-servicenow-2"]').simulate('click');
    wrapper.update();

    expect(wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().exists()).toBeTruthy();
  });

  it('Edit external service on submit', async () => {
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...defaultProps} />
      </TestProviders>
    );

    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    wrapper.update();
    wrapper.find('button[data-test-subj="dropdown-connector-servicenow-2"]').simulate('click');
    wrapper.update();

    expect(wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().exists()).toBeTruthy();

    await act(async () => {
      wrapper.find(`[data-test-subj="edit-connectors-submit"]`).last().simulate('click');
      await wait();
      expect(onSubmit).toBeCalledWith(sampleConnector);
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

    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    wrapper.update();
    wrapper.find('button[data-test-subj="dropdown-connector-servicenow-2"]').simulate('click');
    wrapper.update();

    await act(async () => {
      wrapper.find(`[data-test-subj="edit-connectors-cancel"]`).last().simulate('click');
      await wait();
      wrapper.update();
      expect(formHookMock.setFieldValue).toBeCalledWith(
        'connector',
        defaultProps.selectedConnector
      );
    });
  });

  it('Renders loading spinner', () => {
    const props = { ...defaultProps, isLoading: true };
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...props} />
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj="connector-loading"]`).last().exists()).toBeTruthy();
  });
});
