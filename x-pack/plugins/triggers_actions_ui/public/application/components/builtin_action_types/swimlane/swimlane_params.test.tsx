/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import SwimlaneParamsFields from './swimlane_params';
import { SwimlaneConnectorType } from './types';
import { mappings } from './mocks';

describe('SwimlaneParamsFields renders', () => {
  const editAction = jest.fn();
  const actionParams = {
    subAction: 'pushToService',
    subActionParams: {
      incident: {
        alertId: '3456789',
        ruleName: 'rule name',
        severity: 'critical',
        caseId: null,
        caseName: null,
        description: null,
        externalId: null,
      },
      comments: [],
    },
  };

  const connector = {
    secrets: {},
    config: { mappings, connectorType: SwimlaneConnectorType.All },
    id: 'test',
    actionTypeId: '.test',
    name: 'Test',
    isPreconfigured: false,
    isDeprecated: false,
  };

  const defaultProps = {
    actionParams,
    errors: {
      'subActionParams.incident.ruleName': [],
      'subActionParams.incident.alertId': [],
    },
    editAction,
    index: 0,
    messageVariables: [],
    actionConnector: connector,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('all params fields are rendered', () => {
    const wrapper = mountWithIntl(<SwimlaneParamsFields {...defaultProps} />);

    expect(wrapper.find('[data-test-subj="severity"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="comments"]').exists()).toBeTruthy();
  });

  test('it set the correct default params', () => {
    mountWithIntl(<SwimlaneParamsFields {...defaultProps} actionParams={{}} />);
    expect(editAction).toHaveBeenCalledWith('subAction', 'pushToService', 0);
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      {
        incident: { alertId: '{{alert.id}}', ruleName: '{{rule.name}}' },
        comments: [],
      },
      0
    );
  });

  test('it reset the fields when connector changes', () => {
    const wrapper = mountWithIntl(<SwimlaneParamsFields {...defaultProps} />);
    expect(editAction).not.toHaveBeenCalled();

    wrapper.setProps({ actionConnector: { ...connector, id: '1234' } });
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      {
        incident: { alertId: '{{alert.id}}', ruleName: '{{rule.name}}' },
        comments: [],
      },
      0
    );
  });

  test('it set the severity', () => {
    const wrapper = mountWithIntl(<SwimlaneParamsFields {...defaultProps} />);
    expect(editAction).not.toHaveBeenCalled();

    wrapper.setProps({ actionConnector: { ...connector, id: '1234' } });
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      {
        incident: { alertId: '{{alert.id}}', ruleName: '{{rule.name}}' },
        comments: [],
      },
      0
    );
  });

  describe('UI updates', () => {
    const changeEvent = { target: { value: 'Bug' } } as React.ChangeEvent<HTMLSelectElement>;
    const simpleFields = [
      { dataTestSubj: 'input[data-test-subj="severityInput"]', key: 'severity' },
    ];

    simpleFields.forEach((field) =>
      test(`${field.key} update triggers editAction`, () => {
        const wrapper = mountWithIntl(<SwimlaneParamsFields {...defaultProps} />);
        const theField = wrapper.find(field.dataTestSubj).first();
        theField.prop('onChange')!(changeEvent);
        expect(editAction.mock.calls[0][1].incident[field.key]).toEqual(changeEvent.target.value);
      })
    );

    test('A comment triggers editAction', () => {
      const wrapper = mountWithIntl(<SwimlaneParamsFields {...defaultProps} />);
      const comments = wrapper.find('textarea[data-test-subj="commentsTextArea"]');
      expect(comments.simulate('change', changeEvent));
      expect(editAction.mock.calls[0][1].comments.length).toEqual(1);
    });
  });
});
