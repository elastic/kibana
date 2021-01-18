/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount } from 'enzyme';
import { act } from '@testing-library/react';

import { ActionConnector } from '../../../../types';
import { useGetChoices, Choice } from './use_get_choices';
import ServiceNowParamsFields from './servicenow_sir_params';

jest.mock('./use_get_choices');
jest.mock('../../../../common/lib/kibana');

const useGetChoicesMock = useGetChoices as jest.Mock;

const actionParams = {
  subAction: 'pushToService',
  subActionParams: {
    incident: {
      short_description: 'sn title',
      description: 'some description',
      category: 'Denial of Service',
      dest_ip: '192.168.1.1',
      source_ip: '192.168.1.2',
      malware_hash: '098f6bcd4621d373cade4e832627b4f6',
      malware_url: 'https://attack.com',
      priority: '1',
      subcategory: '20',
      externalId: null,
    },
    comments: [],
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

const categoriesResponse = {
  isLoading: false,
  choices: [
    {
      dependent_value: '',
      label: 'Priviledge Escalation',
      value: 'Priviledge Escalation',
    },
    {
      dependent_value: '',
      label: 'Criminal activity/investigation',
      value: 'Criminal activity/investigation',
    },
    {
      dependent_value: '',
      label: 'Denial of Service',
      value: 'Denial of Service',
    },
  ],
};

const subcategoriesResponse = {
  isLoading: false,
  choices: [
    {
      dependent_value: 'Denial of Service',
      label: 'Inbound or outbound',
      value: '12',
    },
    {
      dependent_value: 'Denial of Service',
      label: 'Single or distributed (DoS or DDoS)',
      value: '26',
    },
    {
      dependent_value: 'Denial of Service',
      label: 'Inbound DDos',
      value: 'inbound_ddos',
    },
  ],
};

describe('ServiceNowParamsFields renders', () => {
  let onSuccessCategories = (choices: Choice[]) => {};
  let onSuccessSubcategories = (choices: Choice[]) => {};

  beforeEach(() => {
    jest.clearAllMocks();
    useGetChoicesMock.mockImplementation((args) => {
      if (args.field === 'category') {
        onSuccessCategories = args.onSuccess;
        return categoriesResponse;
      } else {
        onSuccessSubcategories = args.onSuccess;
        return subcategoriesResponse;
      }
    });
  });

  test('all params fields is rendered', () => {
    const wrapper = mount(<ServiceNowParamsFields {...defaultProps} />);
    expect(wrapper.find('[data-test-subj="short_descriptionInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="source_ipInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="dest_ipInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="malware_urlInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="malware_hashInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="categorySelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="subcategorySelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').exists()).toBeTruthy();
  });

  test('If short_description has errors, form row is invalid', () => {
    const newProps = {
      ...defaultProps,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      errors: { 'subActionParams.incident.short_description': ['error'] },
    };
    const wrapper = mount(<ServiceNowParamsFields {...newProps} />);
    const title = wrapper.find('[data-test-subj="short_descriptionInput"]').first();
    expect(title.prop('isInvalid')).toBeTruthy();
  });

  test('When subActionParams is undefined, set to default', () => {
    const { subActionParams, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };
    mount(<ServiceNowParamsFields {...newProps} />);
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
    mount(<ServiceNowParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual('pushToService');
  });

  test('Resets fields when connector changes', () => {
    const wrapper = mount(<ServiceNowParamsFields {...defaultProps} />);
    expect(editAction.mock.calls.length).toEqual(0);
    wrapper.setProps({ actionConnector: { ...connector, id: '1234' } });
    expect(editAction.mock.calls.length).toEqual(1);
    expect(editAction.mock.calls[0][1]).toEqual({
      incident: {},
      comments: [],
    });
  });

  test('it transforms the categories to options correctly', async () => {
    const wrapper = mount(<ServiceNowParamsFields {...defaultProps} />);
    act(() => {
      onSuccessCategories(categoriesResponse.choices);
    });

    act(() => {
      onSuccessSubcategories(subcategoriesResponse.choices);
    });

    wrapper.update();
    expect(wrapper.find('[data-test-subj="categorySelect"]').first().prop('options')).toEqual([
      { value: 'Priviledge Escalation', text: 'Priviledge Escalation' },
      {
        value: 'Criminal activity/investigation',
        text: 'Criminal activity/investigation',
      },
      { value: 'Denial of Service', text: 'Denial of Service' },
    ]);
  });

  test('it transforms the subcategories to options correctly', async () => {
    const wrapper = mount(<ServiceNowParamsFields {...defaultProps} />);
    act(() => {
      onSuccessCategories(categoriesResponse.choices);
    });

    act(() => {
      onSuccessSubcategories(subcategoriesResponse.choices);
    });

    wrapper.update();
    expect(wrapper.find('[data-test-subj="subcategorySelect"]').first().prop('options')).toEqual([
      {
        text: 'Inbound or outbound',
        value: '12',
      },
      {
        text: 'Single or distributed (DoS or DDoS)',
        value: '26',
      },
      {
        text: 'Inbound DDos',
        value: 'inbound_ddos',
      },
    ]);
  });

  describe('UI updates', () => {
    const changeEvent = { target: { value: 'Bug' } } as React.ChangeEvent<HTMLSelectElement>;
    const simpleFields = [
      { dataTestSubj: 'input[data-test-subj="short_descriptionInput"]', key: 'short_description' },
      { dataTestSubj: 'textarea[data-test-subj="descriptionTextArea"]', key: 'description' },
      { dataTestSubj: '[data-test-subj="source_ipInput"]', key: 'source_ip' },
      { dataTestSubj: '[data-test-subj="dest_ipInput"]', key: 'dest_ip' },
      { dataTestSubj: '[data-test-subj="malware_urlInput"]', key: 'malware_url' },
      { dataTestSubj: '[data-test-subj="malware_hashInput"]', key: 'malware_hash' },
      { dataTestSubj: '[data-test-subj="categorySelect"]', key: 'category' },
      { dataTestSubj: '[data-test-subj="subcategorySelect"]', key: 'subcategory' },
    ];

    simpleFields.forEach((field) =>
      test(`${field.key} update triggers editAction :D`, () => {
        const wrapper = mount(<ServiceNowParamsFields {...defaultProps} />);
        const theField = wrapper.find(field.dataTestSubj).first();
        theField.prop('onChange')!(changeEvent);
        expect(editAction.mock.calls[0][1].incident[field.key]).toEqual(changeEvent.target.value);
      })
    );

    test('A comment triggers editAction', () => {
      const wrapper = mount(<ServiceNowParamsFields {...defaultProps} />);
      const comments = wrapper.find('textarea[data-test-subj="commentsTextArea"]');
      expect(comments.simulate('change', changeEvent));
      expect(editAction.mock.calls[0][1].comments.length).toEqual(1);
    });

    test('An empty comment does not trigger editAction', () => {
      const wrapper = mount(<ServiceNowParamsFields {...defaultProps} />);
      const emptyComment = { target: { value: '' } };
      const comments = wrapper.find('[data-test-subj="commentsTextArea"] textarea');
      expect(comments.simulate('change', emptyComment));
      expect(editAction.mock.calls.length).toEqual(0);
    });
  });
});
