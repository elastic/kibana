/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount } from 'enzyme';
import ServiceNowParamsFields from './servicenow_params';
import { ActionConnector } from '../../../../types';
const actionParams = {
  subAction: 'pushToService',
  subActionParams: {
    incident: {
      short_description: 'sn title',
      description: 'some description',
      severity: '1',
      urgency: '2',
      impact: '3',
      savedObjectId: '123',
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
describe('ServiceNowParamsFields renders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('all params fields is rendered', () => {
    const wrapper = mount(<ServiceNowParamsFields {...defaultProps} />);
    expect(wrapper.find('[data-test-subj="urgencySelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="severitySelect"]').first().prop('value')).toStrictEqual(
      '1'
    );
    expect(wrapper.find('[data-test-subj="impactSelect"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="short_descriptionInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').length > 0).toBeTruthy();
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
  describe('UI updates', () => {
    const changeEvent = { target: { value: 'Bug' } } as React.ChangeEvent<HTMLSelectElement>;
    const simpleFields = [
      { dataTestSubj: 'input[data-test-subj="short_descriptionInput"]', key: 'short_description' },
      { dataTestSubj: 'textarea[data-test-subj="descriptionTextArea"]', key: 'description' },
      { dataTestSubj: '[data-test-subj="urgencySelect"]', key: 'urgency' },
      { dataTestSubj: '[data-test-subj="severitySelect"]', key: 'severity' },
      { dataTestSubj: '[data-test-subj="impactSelect"]', key: 'impact' },
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
