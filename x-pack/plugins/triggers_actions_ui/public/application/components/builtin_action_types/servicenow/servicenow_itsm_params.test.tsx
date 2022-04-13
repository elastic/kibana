/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { act } from '@testing-library/react';

import { ActionConnector } from '../../../../types';
import { useGetChoices } from './use_get_choices';
import ServiceNowITSMParamsFields from './servicenow_itsm_params';
import { Choice } from './types';
import { merge } from 'lodash';

jest.mock('./use_get_choices');
jest.mock('../../../../common/lib/kibana');

const useGetChoicesMock = useGetChoices as jest.Mock;

const actionParams = {
  subAction: 'pushToService',
  subActionParams: {
    incident: {
      short_description: 'sn title',
      description: 'some description',
      severity: '1',
      urgency: '2',
      impact: '3',
      category: 'software',
      subcategory: 'os',
      externalId: null,
      correlation_id: 'alertID',
      correlation_display: 'Alerting',
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

const useGetChoicesResponse = {
  isLoading: false,
  choices: [
    {
      dependent_value: '',
      label: 'Software',
      value: 'software',
      element: 'category',
    },
    {
      dependent_value: 'software',
      label: 'Operation System',
      value: 'os',
      element: 'subcategory',
    },
    {
      dependent_value: '',
      label: 'Failed Login',
      value: 'failed_login',
      element: 'category',
    },
    ...['severity', 'urgency', 'impact']
      .map((element) => [
        {
          dependent_value: '',
          label: '1 - Critical',
          value: '1',
          element,
        },
        {
          dependent_value: '',
          label: '2 - High',
          value: '2',
          element,
        },
        {
          dependent_value: '',
          label: '3 - Moderate',
          value: '3',
          element,
        },
        {
          dependent_value: '',
          label: '4 - Low',
          value: '4',
          element,
        },
      ])
      .flat(),
  ],
};

describe('ServiceNowITSMParamsFields renders', () => {
  let onChoices = (choices: Choice[]) => {};

  beforeEach(() => {
    jest.clearAllMocks();
    useGetChoicesMock.mockImplementation((args) => {
      onChoices = args.onSuccess;
      return useGetChoicesResponse;
    });
  });

  test('all params fields is rendered', () => {
    const wrapper = mountWithIntl(<ServiceNowITSMParamsFields {...defaultProps} />);
    act(() => {
      onChoices(useGetChoicesResponse.choices);
    });
    wrapper.update();
    expect(wrapper.find('[data-test-subj="urgencySelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="severitySelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="impactSelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="categorySelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="subcategorySelect"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="short_descriptionInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="correlation_idInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="correlation_displayInput"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').exists()).toBeTruthy();
  });

  test('If short_description has errors, form row is invalid', () => {
    const newProps = {
      ...defaultProps,
      errors: { 'subActionParams.incident.short_description': ['error'] },
    };
    const wrapper = mountWithIntl(<ServiceNowITSMParamsFields {...newProps} />);
    const title = wrapper.find('[data-test-subj="short_descriptionInput"]').first();
    expect(title.prop('isInvalid')).toBeTruthy();
  });

  test('When subActionParams is undefined, set to default', () => {
    const { subActionParams, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };
    mountWithIntl(<ServiceNowITSMParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual({
      incident: {
        correlation_id: '{{rule.id}}:{{alert.id}}',
      },
      comments: [],
    });
  });

  test('When subAction is undefined, set to default', () => {
    const { subAction, ...newParams } = actionParams;

    const newProps = {
      ...defaultProps,
      actionParams: newParams,
    };
    mountWithIntl(<ServiceNowITSMParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual('pushToService');
  });

  test('Resets fields when connector changes', () => {
    const wrapper = mountWithIntl(<ServiceNowITSMParamsFields {...defaultProps} />);
    expect(editAction.mock.calls.length).toEqual(0);
    wrapper.setProps({ actionConnector: { ...connector, id: '1234' } });
    expect(editAction.mock.calls.length).toEqual(1);
    expect(editAction.mock.calls[0][1]).toEqual({
      incident: {
        correlation_id: '{{rule.id}}:{{alert.id}}',
      },
      comments: [],
    });
  });

  test('it transforms the categories to options correctly', async () => {
    const wrapper = mountWithIntl(<ServiceNowITSMParamsFields {...defaultProps} />);
    act(() => {
      onChoices(useGetChoicesResponse.choices);
    });

    wrapper.update();
    expect(wrapper.find('[data-test-subj="categorySelect"]').first().prop('options')).toEqual([
      {
        value: 'software',
        text: 'Software',
      },
      {
        value: 'failed_login',
        text: 'Failed Login',
      },
    ]);
  });

  test('it transforms the subcategories to options correctly', async () => {
    const wrapper = mountWithIntl(<ServiceNowITSMParamsFields {...defaultProps} />);
    act(() => {
      onChoices(useGetChoicesResponse.choices);
    });

    wrapper.update();
    expect(wrapper.find('[data-test-subj="subcategorySelect"]').first().prop('options')).toEqual([
      {
        text: 'Operation System',
        value: 'os',
      },
    ]);
  });

  test('it transforms the options correctly', async () => {
    const wrapper = mountWithIntl(<ServiceNowITSMParamsFields {...defaultProps} />);
    act(() => {
      onChoices(useGetChoicesResponse.choices);
    });

    wrapper.update();
    const testers = ['severity', 'urgency', 'impact'];
    testers.forEach((subj) =>
      expect(wrapper.find(`[data-test-subj="${subj}Select"]`).first().prop('options')).toEqual([
        { value: '1', text: '1 - Critical' },
        { value: '2', text: '2 - High' },
        { value: '3', text: '3 - Moderate' },
        { value: '4', text: '4 - Low' },
      ])
    );
  });

  it('should hide subcategory if selecting a category without subcategories', async () => {
    const newProps = merge({}, defaultProps, {
      actionParams: {
        subActionParams: {
          incident: {
            category: 'failed_login',
            subcategory: null,
          },
        },
      },
    });
    const wrapper = mountWithIntl(<ServiceNowITSMParamsFields {...newProps} />);
    act(() => {
      onChoices(useGetChoicesResponse.choices);
    });

    wrapper.update();
    expect(wrapper.find('[data-test-subj="subcategorySelect"]').exists()).toBeFalsy();
  });

  describe('UI updates', () => {
    const changeEvent = { target: { value: 'Bug' } } as React.ChangeEvent<HTMLSelectElement>;
    const simpleFields = [
      { dataTestSubj: 'input[data-test-subj="short_descriptionInput"]', key: 'short_description' },
      { dataTestSubj: 'input[data-test-subj="correlation_idInput"]', key: 'correlation_id' },
      {
        dataTestSubj: 'input[data-test-subj="correlation_displayInput"]',
        key: 'correlation_display',
      },
      { dataTestSubj: 'textarea[data-test-subj="descriptionTextArea"]', key: 'description' },
      { dataTestSubj: '[data-test-subj="urgencySelect"]', key: 'urgency' },
      { dataTestSubj: '[data-test-subj="severitySelect"]', key: 'severity' },
      { dataTestSubj: '[data-test-subj="impactSelect"]', key: 'impact' },
      { dataTestSubj: '[data-test-subj="categorySelect"]', key: 'category' },
      { dataTestSubj: '[data-test-subj="subcategorySelect"]', key: 'subcategory' },
    ];

    simpleFields.forEach((field) =>
      test(`${field.key} update triggers editAction :D`, () => {
        const wrapper = mountWithIntl(<ServiceNowITSMParamsFields {...defaultProps} />);
        act(() => {
          onChoices(useGetChoicesResponse.choices);
        });
        wrapper.update();
        const theField = wrapper.find(field.dataTestSubj).first();
        theField.prop('onChange')!(changeEvent);
        expect(editAction.mock.calls[0][1].incident[field.key]).toEqual(changeEvent.target.value);
      })
    );

    test('A comment triggers editAction', () => {
      const wrapper = mountWithIntl(<ServiceNowITSMParamsFields {...defaultProps} />);
      const comments = wrapper.find('textarea[data-test-subj="commentsTextArea"]');
      expect(comments.simulate('change', changeEvent));
      expect(editAction.mock.calls[0][1].comments.length).toEqual(1);
    });
  });
});
