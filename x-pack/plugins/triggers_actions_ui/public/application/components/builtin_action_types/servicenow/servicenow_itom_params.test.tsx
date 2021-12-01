/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { ActionConnector } from '../../../../types';
import { useChoices } from './use_choices';
import ServiceNowITOMParamsFields from './servicenow_itom_params';

jest.mock('./use_choices');
jest.mock('../../../../common/lib/kibana');

const useChoicesMock = useChoices as jest.Mock;

const actionParams = {
  subAction: 'addEvent',
  subActionParams: {
    source: 'A source',
    event_class: 'An event class',
    resource: 'C:',
    node: 'node.example.com',
    metric_name: 'Percentage Logical Disk Free Space',
    type: 'Disk space',
    severity: '4',
    description: 'desc',
    additional_info: '{"alert": "test"}',
    message_key: 'a key',
    time_of_event: '2021-10-13T10:51:44.981Z',
  },
};

const connector: ActionConnector = {
  secrets: {},
  config: {},
  id: 'test',
  actionTypeId: '.test',
  name: 'Test',
  isPreconfigured: false,
};

const editAction = jest.fn();
const defaultProps = {
  actionConnector: connector,
  actionParams,
  errors: { ['subActionParams.incident.short_description']: [] },
  editAction,
  index: 0,
  messageVariables: [],
};

const choicesResponse = {
  isLoading: false,
  choices: {
    severity: [
      {
        dependent_value: '',
        label: '1 - Critical',
        value: '1',
        element: 'severity',
      },
      {
        dependent_value: '',
        label: '2 - Major',
        value: '2',
        element: 'severity',
      },
    ],
  },
};

describe('ServiceNowITOMParamsFields renders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChoicesMock.mockImplementation((args) => {
      return choicesResponse;
    });
  });

  test('all params fields is rendered', () => {
    const wrapper = mount(<ServiceNowITOMParamsFields {...defaultProps} />);
    expect(wrapper.find('[data-test-subj="sourceInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="nodeInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="typeInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="resourceInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="metric_nameInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="event_classInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="message_keyInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="severitySelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').exists()).toBeTruthy();
  });

  test('If severity has errors, form row is invalid', () => {
    const newProps = {
      ...defaultProps,
      errors: { severity: ['error'] },
    };
    const wrapper = mount(<ServiceNowITOMParamsFields {...newProps} />);
    const severity = wrapper.find('[data-test-subj="severitySelect"]').first();
    expect(severity.prop('isInvalid')).toBeTruthy();
  });

  test('When subActionParams is undefined, set to default', () => {
    const { subActionParams, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };

    mount(<ServiceNowITOMParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual({
      message_key: '{{rule.id}}:{{alert.id}}',
      additional_info:
        '{"alert":{"id":"{{alert.id}}","actionGroup":"{{alert.actionGroup}}","actionSubgroup":"{{alert.actionSubgroup}}","actionGroupName":"{{alert.actionGroupName}}"},"rule":{"id":"{{rule.id}}","name":"{{rule.name}}","type":"{{rule.type}}"},"date":"{{date}}"}',
    });
  });

  test('When subAction is undefined, set to default', () => {
    const { subAction, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };
    mount(<ServiceNowITOMParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual('addEvent');
  });

  test('Resets fields when connector changes', () => {
    const wrapper = mount(<ServiceNowITOMParamsFields {...defaultProps} />);
    expect(editAction.mock.calls.length).toEqual(0);
    wrapper.setProps({ actionConnector: { ...connector, id: '1234' } });
    expect(editAction.mock.calls.length).toEqual(1);
    expect(editAction.mock.calls[0][1]).toEqual({
      message_key: '{{rule.id}}:{{alert.id}}',
      additional_info:
        '{"alert":{"id":"{{alert.id}}","actionGroup":"{{alert.actionGroup}}","actionSubgroup":"{{alert.actionSubgroup}}","actionGroupName":"{{alert.actionGroupName}}"},"rule":{"id":"{{rule.id}}","name":"{{rule.name}}","type":"{{rule.type}}"},"date":"{{date}}"}',
    });
  });

  test('it transforms the categories to options correctly', async () => {
    const wrapper = mount(<ServiceNowITOMParamsFields {...defaultProps} />);

    wrapper.update();
    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('options')).toEqual([
      { value: '1', text: '1 - Critical' },
      { value: '2', text: '2 - Major' },
    ]);
  });

  describe('UI updates', () => {
    const changeEvent = { target: { value: 'Bug' } } as React.ChangeEvent<HTMLSelectElement>;
    const simpleFields = [
      { dataTestSubj: 'input[data-test-subj="sourceInput"]', key: 'source' },
      { dataTestSubj: 'textarea[data-test-subj="descriptionTextArea"]', key: 'description' },
      { dataTestSubj: '[data-test-subj="nodeInput"]', key: 'node' },
      { dataTestSubj: '[data-test-subj="typeInput"]', key: 'type' },
      { dataTestSubj: '[data-test-subj="resourceInput"]', key: 'resource' },
      { dataTestSubj: '[data-test-subj="metric_nameInput"]', key: 'metric_name' },
      { dataTestSubj: '[data-test-subj="event_classInput"]', key: 'event_class' },
      { dataTestSubj: '[data-test-subj="message_keyInput"]', key: 'message_key' },
      { dataTestSubj: '[data-test-subj="severitySelect"]', key: 'severity' },
    ];

    simpleFields.forEach((field) =>
      test(`${field.key} update triggers editAction :D`, () => {
        const wrapper = mount(<ServiceNowITOMParamsFields {...defaultProps} />);
        const theField = wrapper.find(field.dataTestSubj).first();
        theField.prop('onChange')!(changeEvent);
        expect(editAction.mock.calls[0][1][field.key]).toEqual(changeEvent.target.value);
      })
    );
  });
});
