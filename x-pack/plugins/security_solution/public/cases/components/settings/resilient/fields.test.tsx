/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { waitFor } from '@testing-library/react';

import { connector } from '../mock';
import { useGetIncidentTypes } from './use_get_incident_types';
import { useGetSeverity } from './use_get_severity';
import Fields from './fields';

jest.mock('../../../../common/lib/kibana');
jest.mock('./use_get_incident_types');
jest.mock('./use_get_severity');

const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;

describe('ResilientParamsFields renders', () => {
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

  const fields = {
    severityCode: '6',
    incidentTypes: ['19'],
  };

  const onChange = jest.fn();

  beforeEach(() => {
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
    jest.clearAllMocks();
  });

  test('all params fields are rendered', () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
    expect(wrapper.find('[data-test-subj="incidentTypeComboBox"]').first().prop('options')).toEqual(
      [
        { label: 'Malware', value: '19' },
        { label: 'Denial of Service', value: '21' },
      ]
    );

    expect(
      wrapper.find('[data-test-subj="incidentTypeComboBox"]').first().prop('selectedOptions')
    ).toEqual([{ label: 'Malware', value: '19' }]);

    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toStrictEqual(
      '6'
    );
  });

  test('it disabled the fields when loading incident types', () => {
    useGetIncidentTypesMock.mockReturnValue({ ...useGetIncidentTypesResponse, isLoading: true });

    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);

    expect(
      wrapper.find('[data-test-subj="incidentTypeComboBox"]').first().prop('isDisabled')
    ).toBeTruthy();
  });

  test('it disabled the fields when loading severity', () => {
    useGetSeverityMock.mockReturnValue({
      ...useGetSeverityResponse,
      isLoading: true,
    });

    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);

    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('disabled')).toBeTruthy();
  });

  test('it sets issue type correctly', async () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);

    await waitFor(() => {
      ((wrapper.find(EuiComboBox).props() as unknown) as {
        onChange: (a: EuiComboBoxOptionOption[]) => void;
      }).onChange([{ value: '19', label: 'Denial of Service' }]);
    });

    expect(onChange).toHaveBeenCalledWith({ incidentTypes: ['19'], severityCode: '6' });
  });

  test('it sets severity correctly', async () => {
    const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);

    wrapper
      .find('select[data-test-subj="severitySelect"]')
      .first()
      .simulate('change', {
        target: { value: '4' },
      });

    expect(onChange).toHaveBeenCalledWith({ incidentTypes: ['19'], severityCode: '4' });
  });
});
