/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { act, waitFor } from '@testing-library/react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { useForm, Form, FormHook } from '../../../shared_imports';
import { connectorsMock } from '../../containers/mock';
import { Connector } from './connector';
import { useConnectors } from '../../containers/configure/use_connectors';
import { useGetIncidentTypes } from '../settings/resilient/use_get_incident_types';
import { useGetSeverity } from '../settings/resilient/use_get_severity';
import { schema, FormProps } from './schema';

jest.mock('../../../common/lib/kibana', () => {
  return {
    useKibana: () => ({
      services: {
        notifications: {},
        http: {},
      },
    }),
  };
});
jest.mock('../../containers/configure/use_connectors');
jest.mock('../settings/resilient/use_get_incident_types');
jest.mock('../settings/resilient/use_get_severity');

const useConnectorsMock = useConnectors as jest.Mock;
const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;

const useGetIncidentTypesResponse = {
  isLoading: false,
  incidentTypes: [
    {
      id: 19,
      name: 'Malware',
    },
    {
      id: 21,
      name: 'Denial of Service',
    },
  ],
};

const useGetSeverityResponse = {
  isLoading: false,
  severity: [
    {
      id: 4,
      name: 'Low',
    },
    {
      id: 5,
      name: 'Medium',
    },
    {
      id: 6,
      name: 'High',
    },
  ],
};

describe('Connector', () => {
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
    jest.resetAllMocks();
    useConnectorsMock.mockReturnValue({ loading: false, connectors: connectorsMock });
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
  });

  it('it renders', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <Connector isLoading={false} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="caseConnectors"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="connector-settings"]`).exists()).toBeTruthy();

    await waitFor(() => {
      expect(wrapper.find(`button[data-test-subj="dropdown-connectors"]`).first().text()).toBe(
        'My Connector'
      );
    });

    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find(`[data-test-subj="connector-settings-sn"]`).exists()).toBeTruthy();
    });
  });

  it('it is loading when fetching connectors', async () => {
    useConnectorsMock.mockReturnValue({ loading: true, connectors: connectorsMock });
    const wrapper = mount(
      <MockHookWrapperComponent>
        <Connector isLoading={false} />
      </MockHookWrapperComponent>
    );

    expect(
      wrapper.find('[data-test-subj="dropdown-connectors"]').first().prop('isLoading')
    ).toEqual(true);
  });

  it('it is disabled when fetching connectors', async () => {
    useConnectorsMock.mockReturnValue({ loading: true, connectors: connectorsMock });
    const wrapper = mount(
      <MockHookWrapperComponent>
        <Connector isLoading={false} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find('[data-test-subj="dropdown-connectors"]').first().prop('disabled')).toEqual(
      true
    );
  });

  it('it is disabled and loading when passing loading as true', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <Connector isLoading={true} />
      </MockHookWrapperComponent>
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
      <MockHookWrapperComponent>
        <Connector isLoading={false} />
      </MockHookWrapperComponent>
    );

    await waitFor(() => {
      expect(wrapper.find(`[data-test-subj="connector-settings-resilient"]`).exists()).toBeFalsy();
      wrapper.find('button[data-test-subj="dropdown-connectors"]').simulate('click');
      wrapper.find(`button[data-test-subj="dropdown-connector-resilient-2"]`).simulate('click');
      wrapper.update();
    });

    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find(`[data-test-subj="connector-settings-resilient"]`).exists()).toBeTruthy();
    });

    act(() => {
      ((wrapper.find(EuiComboBox).props() as unknown) as {
        onChange: (a: EuiComboBoxOptionOption[]) => void;
      }).onChange([{ value: '19', label: 'Denial of Service' }]);
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
});
