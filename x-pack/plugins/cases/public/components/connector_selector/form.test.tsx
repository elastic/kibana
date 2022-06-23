/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { UseField, Form, useForm, FormHook } from '../../common/shared_imports';
import { ConnectorSelector } from './form';
import { connectorsMock } from '../../containers/mock';
import { getFormMock } from '../__mock__/form';
import { useKibana } from '../../common/lib/kibana';

jest.mock('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib/hooks/use_form');
jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const useFormMock = useForm as jest.Mock;

describe('ConnectorSelector', () => {
  const formHookMock = getFormMock({ connectorId: connectorsMock[0].id });

  beforeEach(() => {
    useFormMock.mockImplementation(() => ({ form: formHookMock }));
    useKibanaMock().services.triggersActionsUi.actionTypeRegistry.get = jest.fn().mockReturnValue({
      actionTypeTitle: 'test',
      iconClass: 'logoSecurity',
    });
  });

  it('it should render', async () => {
    const wrapper = mount(
      <Form form={formHookMock as unknown as FormHook}>
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
      <Form form={formHookMock as unknown as FormHook}>
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
