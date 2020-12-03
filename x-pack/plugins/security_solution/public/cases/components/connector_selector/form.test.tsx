/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { UseField, Form, useForm, FormHook } from '../../../shared_imports';
import { ConnectorSelector } from './form';
import { connectorsMock } from '../../containers/mock';
import { getFormMock } from '../__mock__/form';

jest.mock(
  '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form'
);

const useFormMock = useForm as jest.Mock;

describe('ConnectorSelector', () => {
  const formHookMock = getFormMock({ connectorId: connectorsMock[0].id });

  beforeEach(() => {
    jest.resetAllMocks();
    useFormMock.mockImplementation(() => ({ form: formHookMock }));
  });

  it('it should render', async () => {
    const wrapper = mount(
      <Form form={(formHookMock as unknown) as FormHook}>
        <UseField
          path="connectorId"
          component={ConnectorSelector}
          componentProps={{
            connectors: connectorsMock,
            dataTestSubj: 'caseConnectors',
            disabled: false,
            idAria: 'caseConnectors',
            isLoading: false,
          }}
        />
      </Form>
    );

    expect(wrapper.find(`[data-test-subj="caseConnectors"]`).exists()).toBeTruthy();
  });

  it('it should not render when is not in edit mode', async () => {
    const wrapper = mount(
      <Form form={(formHookMock as unknown) as FormHook}>
        <UseField
          path="connectorId"
          component={ConnectorSelector}
          componentProps={{
            connectors: connectorsMock,
            dataTestSubj: 'caseConnectors',
            disabled: false,
            idAria: 'caseConnectors',
            isLoading: false,
            isEdit: false,
          }}
        />
      </Form>
    );

    expect(wrapper.find(`[data-test-subj="caseConnectors"]`).exists()).toBeFalsy();
  });
});
