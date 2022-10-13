/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act, waitFor } from '@testing-library/react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { useForm, Form, FormHook } from '../../common/shared_imports';
import { connectorsMock } from '../../containers/mock';
import { Connector } from './connector';
import { useGetIncidentTypes } from '../connectors/resilient/use_get_incident_types';
import { useGetSeverity } from '../connectors/resilient/use_get_severity';
import { useGetChoices } from '../connectors/servicenow/use_get_choices';
import { incidentTypes, severity, choices } from '../connectors/mock';
import { schema, FormProps } from './schema';
import { AppMockRenderer, createAppMockRenderer, TestProviders } from '../../common/mock';
import { useCaseConfigure } from '../../containers/configure/use_configure';
import { useCaseConfigureResponse } from '../configure_cases/__mock__';

jest.mock('../connectors/resilient/use_get_incident_types');
jest.mock('../connectors/resilient/use_get_severity');
jest.mock('../connectors/servicenow/use_get_choices');
jest.mock('../../containers/configure/use_configure');

const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;
const useGetChoicesMock = useGetChoices as jest.Mock;
const useCaseConfigureMock = useCaseConfigure as jest.Mock;

const useGetIncidentTypesResponse = {
  isLoading: false,
  incidentTypes,
};

const useGetSeverityResponse = {
  isLoading: false,
  severity,
};

const useGetChoicesResponse = {
  isLoading: false,
  choices,
};

const defaultProps = {
  connectors: connectorsMock,
  isLoading: false,
  isLoadingConnectors: false,
};

describe('Connector', () => {
  let appMockRender: AppMockRenderer;
  let globalForm: FormHook;

  const MockHookWrapperComponent: React.FC = ({ children }) => {
    const { form } = useForm<FormProps>({
      defaultValue: { connectorId: connectorsMock[0].id, fields: null },
      schema: {
        connectorId: schema.connectorId,
        fields: schema.fields,
      },
    });

    globalForm = form;

    return <Form form={form}>{children}</Form>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
    useGetChoicesMock.mockReturnValue(useGetChoicesResponse);
    useCaseConfigureMock.mockImplementation(() => useCaseConfigureResponse);
  });

  it('it renders', async () => {
    const wrapper = mount(
      <TestProviders>
        <MockHookWrapperComponent>
          <Connector {...defaultProps} />
        </MockHookWrapperComponent>
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="caseConnectors"]`).exists()).toBeTruthy();
    // Selected connector is set to none so no fields should be displayed
    expect(wrapper.find(`[data-test-subj="connector-fields"]`).exists()).toBeFalsy();
  });

  it('it is disabled and loading when isLoadingConnectors=true', async () => {
    const wrapper = mount(
      <TestProviders>
        <MockHookWrapperComponent>
          <Connector {...{ ...defaultProps, isLoadingConnectors: true }} />
        </MockHookWrapperComponent>
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="dropdown-connectors"]').first().prop('isLoading')
    ).toEqual(true);

    expect(wrapper.find('[data-test-subj="dropdown-connectors"]').first().prop('disabled')).toEqual(
      true
    );
  });

  it('it is disabled and loading when isLoading=true', async () => {
    const wrapper = mount(
      <TestProviders>
        <MockHookWrapperComponent>
          <Connector {...{ ...defaultProps, isLoading: true }} />
        </MockHookWrapperComponent>
      </TestProviders>
    );

    expect(
      wrapper.find('[data-test-subj="dropdown-connectors"]').first().prop('isLoading')
    ).toEqual(true);
    expect(wrapper.find('[data-test-subj="dropdown-connectors"]').first().prop('disabled')).toEqual(
      true
    );
  });

  it(`it should change connector`, async () => {
    const wrapper = mount(
      <TestProviders>
        <MockHookWrapperComponent>
          <Connector {...defaultProps} />
        </MockHookWrapperComponent>
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="connector-fields-resilient"]`).exists()).toBeFalsy();
    wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
    wrapper.find(`button[data-test-subj="dropdown-connector-resilient-2"]`).simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find(`[data-test-subj="connector-fields-resilient"]`).exists()).toBeTruthy();
    });

    act(() => {
      (
        wrapper.find(EuiComboBox).props() as unknown as {
          onChange: (a: EuiComboBoxOptionOption[]) => void;
        }
      ).onChange([{ value: '19', label: 'Denial of Service' }]);
    });

    act(() => {
      wrapper
        .find('select[data-test-subj="severitySelect"]')
        .first()
        .simulate('change', {
          target: { value: '4' },
        });
    });

    await waitFor(() => {
      expect(globalForm.getFormData()).toEqual({
        connectorId: 'resilient-2',
        fields: { incidentTypes: ['19'], severityCode: '4' },
      });
    });
  });

  it('shows the actions permission message if the user does not have read access to actions', async () => {
    appMockRender.coreStart.application.capabilities = {
      ...appMockRender.coreStart.application.capabilities,
      actions: { save: false, show: false },
    };

    const result = appMockRender.render(
      <MockHookWrapperComponent>
        <Connector {...defaultProps} />
      </MockHookWrapperComponent>
    );
    expect(result.getByTestId('create-case-connector-permissions-error-msg')).toBeInTheDocument();
    expect(result.queryByTestId('caseConnectors')).toBe(null);
  });
});
