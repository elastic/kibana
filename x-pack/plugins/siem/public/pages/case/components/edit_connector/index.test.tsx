/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { EditConnector } from './index';
import { getFormMock } from '../__mock__/form';
import { TestProviders } from '../../../../mock';
import { connectorsMock } from '../../../../containers/case/configure/mock';
import { wait } from '../../../../lib/helpers';
import { useForm } from '../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks';
import { act } from 'react-dom/test-utils';

jest.mock(
  '../../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form'
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
    jest.resetAllMocks();
    (useForm as jest.Mock).mockImplementation(() => ({ form: formHookMock }));
  });
  it('Renders no connector, and then edit', () => {
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...defaultProps} />
      </TestProviders>
    );
    expect(
      wrapper
        .find(`[data-test-subj="no-connector"]`)
        .last()
        .exists()
    ).toBeTruthy();
    wrapper
      .find(`[data-test-subj="tag-list-edit-button"]`)
      .last()
      .simulate('click');
    expect(
      wrapper
        .find(`[data-test-subj="no-connector"]`)
        .last()
        .exists()
    ).toBeFalsy();
    expect(
      wrapper
        .find(`[data-test-subj="edit-connector"]`)
        .last()
        .exists()
    ).toBeTruthy();
  });
  it('Edit tag on submit', async () => {
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...defaultProps} />
      </TestProviders>
    );
    wrapper
      .find(`[data-test-subj="tag-list-edit-button"]`)
      .last()
      .simulate('click');
    await act(async () => {
      wrapper
        .find(`[data-test-subj="edit-connector-submit"]`)
        .last()
        .simulate('click');
      await wait();
      expect(onSubmit).toBeCalledWith(sampleConnector);
    });
  });
  it('Cancels on cancel', async () => {
    const props = {
      ...defaultProps,
      connector: ['pepsi'],
    };
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...props} />
      </TestProviders>
    );
    expect(
      wrapper
        .find(`[data-test-subj="case-tag"]`)
        .last()
        .exists()
    ).toBeTruthy();
    wrapper
      .find(`[data-test-subj="tag-list-edit-button"]`)
      .last()
      .simulate('click');
    await act(async () => {
      expect(
        wrapper
          .find(`[data-test-subj="case-tag"]`)
          .last()
          .exists()
      ).toBeFalsy();
      wrapper
        .find(`[data-test-subj="edit-connector-cancel"]`)
        .last()
        .simulate('click');
      await wait();
      wrapper.update();
      expect(
        wrapper
          .find(`[data-test-subj="case-tag"]`)
          .last()
          .exists()
      ).toBeTruthy();
    });
  });
  it('Renders disabled button', () => {
    const props = { ...defaultProps, disabled: true };
    const wrapper = mount(
      <TestProviders>
        <EditConnector {...props} />
      </TestProviders>
    );
    expect(
      wrapper
        .find(`[data-test-subj="tag-list-edit-button"]`)
        .last()
        .prop('disabled')
    ).toBeTruthy();
  });
});
