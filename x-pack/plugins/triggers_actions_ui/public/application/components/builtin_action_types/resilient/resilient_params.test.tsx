/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import ResilientParamsFields from './resilient_params';
import { useGetIncidentTypes } from './use_get_incident_types';
import { useGetSeverity } from './use_get_severity';
import { EuiComboBoxOptionOption } from '@elastic/eui';

jest.mock('./use_get_incident_types');
jest.mock('./use_get_severity');
jest.mock('../../../../common/lib/kibana');

const useGetIncidentTypesMock = useGetIncidentTypes as jest.Mock;
const useGetSeverityMock = useGetSeverity as jest.Mock;

const actionParams = {
  subAction: 'pushToService',
  subActionParams: {
    incident: {
      name: 'title',
      description: 'some description',
      incidentTypes: [1001],
      severityCode: 6,
      externalId: null,
    },
    comments: [],
  },
};
const connector = {
  secrets: {},
  config: {},
  id: 'test',
  actionTypeId: '.test',
  name: 'Test',
  isPreconfigured: false,
  isDeprecated: false,
};

const editAction = jest.fn();
const defaultProps = {
  actionParams,
  errors: { 'subActionParams.incident.name': [] },
  editAction,
  index: 0,
  messageVariables: [],
  actionConnector: connector,
};

describe('ResilientParamsFields renders', () => {
  const useGetIncidentTypesResponse = {
    isLoading: false,
    incidentTypes: [
      { id: 19, name: 'Malware' },
      { id: 21, name: 'Denial of Service' },
    ],
  };

  const useGetSeverityResponse = {
    isLoading: false,
    severity: [
      { id: 4, name: 'Low' },
      { id: 5, name: 'Medium' },
      { id: 6, name: 'High' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useGetIncidentTypesMock.mockReturnValue(useGetIncidentTypesResponse);
    useGetSeverityMock.mockReturnValue(useGetSeverityResponse);
  });

  test('all params fields are rendered', () => {
    const wrapper = mount(<ResilientParamsFields {...defaultProps} />);
    expect(wrapper.find('[data-test-subj="incidentTypeComboBox"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toStrictEqual(
      6
    );
    expect(wrapper.find('[data-test-subj="nameInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').length > 0).toBeTruthy();
  });
  test('it shows loading when loading incident types', () => {
    useGetIncidentTypesMock.mockReturnValue({ ...useGetIncidentTypesResponse, isLoading: true });
    const wrapper = mount(<ResilientParamsFields {...defaultProps} />);

    expect(
      wrapper.find('[data-test-subj="incidentTypeComboBox"]').first().prop('isLoading')
    ).toBeTruthy();
  });

  test('it shows loading when loading severity', () => {
    useGetSeverityMock.mockReturnValue({
      ...useGetSeverityResponse,
      isLoading: true,
    });

    const wrapper = mount(<ResilientParamsFields {...defaultProps} />);

    expect(
      wrapper.find('[data-test-subj="severitySelect"]').first().prop('isLoading')
    ).toBeTruthy();
  });

  test('it disabled the fields when loading issue types', () => {
    useGetIncidentTypesMock.mockReturnValue({ ...useGetIncidentTypesResponse, isLoading: true });

    const wrapper = mount(<ResilientParamsFields {...defaultProps} />);

    expect(
      wrapper.find('[data-test-subj="incidentTypeComboBox"]').first().prop('isDisabled')
    ).toBeTruthy();
  });

  test('it disabled the fields when loading severity', () => {
    useGetSeverityMock.mockReturnValue({
      ...useGetSeverityResponse,
      isLoading: true,
    });

    const wrapper = mount(<ResilientParamsFields {...defaultProps} />);

    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('disabled')).toBeTruthy();
  });
  test('If name has errors, form row is invalid', () => {
    const newProps = {
      ...defaultProps,
      errors: { 'subActionParams.incident.name': ['error'] },
    };
    const wrapper = mount(<ResilientParamsFields {...newProps} />);
    const title = wrapper.find('[data-test-subj="nameInput"]').first();
    expect(title.prop('isInvalid')).toBeTruthy();
  });
  test('When subActionParams is undefined, set to default', () => {
    const { subActionParams, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };
    mount(<ResilientParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual({
      incident: {},
      comments: [],
    });
  });
  test('When subAction is undefined, set to default', () => {
    const { subAction, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };
    mount(<ResilientParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual('pushToService');
  });
  test('Resets fields when connector changes', () => {
    const wrapper = mount(<ResilientParamsFields {...defaultProps} />);
    expect(editAction.mock.calls.length).toEqual(0);
    wrapper.setProps({ actionConnector: { ...connector, id: '1234' } });
    expect(editAction.mock.calls.length).toEqual(1);
    expect(editAction.mock.calls[0][1]).toEqual({
      incident: {},
      comments: [],
    });
  });
  describe('UI updates', () => {
    const changeEvent = { target: { value: 'Bug' } } as React.ChangeEvent<HTMLSelectElement>;
    const simpleFields = [
      { dataTestSubj: 'input[data-test-subj="nameInput"]', key: 'name' },
      { dataTestSubj: 'textarea[data-test-subj="descriptionTextArea"]', key: 'description' },
      { dataTestSubj: '[data-test-subj="severitySelect"]', key: 'severityCode' },
    ];
    simpleFields.forEach((field) =>
      test(`${field.key} update triggers editAction :D`, () => {
        const wrapper = mount(<ResilientParamsFields {...defaultProps} />);
        const theField = wrapper.find(field.dataTestSubj).first();
        theField.prop('onChange')!(changeEvent);
        expect(editAction.mock.calls[0][1].incident[field.key]).toEqual(changeEvent.target.value);
      })
    );
    test('incidentTypeComboBox creation triggers editAction', () => {
      const wrapper = mount(<ResilientParamsFields {...defaultProps} />);
      const incidentTypes = wrapper.find('[data-test-subj="incidentTypeComboBox"]');
      (
        incidentTypes.at(0).props() as unknown as {
          onChange: (a: EuiComboBoxOptionOption[]) => void;
        }
      ).onChange([{ label: 'Cool' }]);
      expect(editAction.mock.calls[0][1].incident.incidentTypes).toEqual(['Cool']);
    });
    test('incidentTypes undefined triggers editAction', () => {
      const newProps = {
        ...defaultProps,
        actionParams: {
          ...actionParams,
          subActionParams: {
            ...actionParams.subActionParams,
            incident: {
              ...actionParams.subActionParams.incident,
              incidentTypes: null,
            },
          },
        },
      };
      const wrapper = mount(<ResilientParamsFields {...newProps} />);
      const incidentTypes = wrapper.find('[data-test-subj="incidentTypeComboBox"]');
      (
        incidentTypes.at(0).props() as unknown as {
          onBlur: () => void;
        }
      ).onBlur();
      expect(editAction.mock.calls[0][1].incident.incidentTypes).toEqual([]);
    });
    test('A comment triggers editAction', () => {
      const wrapper = mount(<ResilientParamsFields {...defaultProps} />);
      const comments = wrapper.find('textarea[data-test-subj="commentsTextArea"]');
      expect(comments.simulate('change', changeEvent));
      expect(editAction.mock.calls[0][1].comments.length).toEqual(1);
    });
  });
});
