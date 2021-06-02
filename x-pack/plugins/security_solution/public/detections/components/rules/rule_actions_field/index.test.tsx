/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { getSupportedActions, RuleActionsField } from './index';
import { useForm, Form } from '../../../../shared_imports';
import { useKibana } from '../../../../common/lib/kibana';
import { useFormFieldMock } from '../../../../common/mock';
import { ActionType } from '../../../../../../actions/common';
jest.mock('../../../../common/lib/kibana');

describe('RuleActionsField', () => {
  it('should not render ActionForm if no actions are supported', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        triggersActionsUi: {
          actionTypeRegistry: {},
        },
        application: {
          capabilities: {
            actions: {
              delete: true,
              save: true,
              show: true,
            },
          },
        },
      },
    });

    const messageVariables = {
      context: [],
      state: [],
      params: [],
    };

    const Component = () => {
      const field = useFormFieldMock();
      const { form } = useForm();

      return (
        <Form form={form}>
          <RuleActionsField
            field={field}
            messageVariables={messageVariables}
            hasErrorOnCreationCaseAction={false}
          />
        </Form>
      );
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('ActionForm')).toHaveLength(0);
  });

  describe('#getSupportedActions', () => {
    const actions: ActionType[] = [
      {
        id: '.jira',
        name: 'My Jira',
        enabled: true,
        enabledInConfig: false,
        enabledInLicense: true,
        minimumLicenseRequired: 'gold',
      },
      {
        id: '.case',
        name: 'Cases',
        enabled: true,
        enabledInConfig: false,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
      },
    ];

    it('if we have an error on case action creation, we do not support case connector', () => {
      expect(getSupportedActions(actions, true)).toMatchInlineSnapshot(`
        Array [
          Object {
            "enabled": true,
            "enabledInConfig": false,
            "enabledInLicense": true,
            "id": ".jira",
            "minimumLicenseRequired": "gold",
            "name": "My Jira",
          },
        ]
      `);
    });

    // sub-cases-enabled: remove this once the sub cases and connector feature is completed
    // https://github.com/elastic/kibana/issues/94115
    it('should not contain the case connector as a supported action', () => {
      expect(getSupportedActions(actions, false)).toMatchInlineSnapshot(`
        Array [
          Object {
            "enabled": true,
            "enabledInConfig": false,
            "enabledInLicense": true,
            "id": ".jira",
            "minimumLicenseRequired": "gold",
            "name": "My Jira",
          },
        ]
      `);
    });

    // sub-cases-enabled: unskip after sub cases and the case connector is supported
    // https://github.com/elastic/kibana/issues/94115
    it.skip('if we do NOT have an error on case action creation, we are supporting case connector', () => {
      expect(getSupportedActions(actions, false)).toMatchInlineSnapshot(`
        Array [
          Object {
            "enabled": true,
            "enabledInConfig": false,
            "enabledInLicense": true,
            "id": ".jira",
            "minimumLicenseRequired": "gold",
            "name": "My Jira",
          },
          Object {
            "enabled": true,
            "enabledInConfig": false,
            "enabledInLicense": true,
            "id": ".case",
            "minimumLicenseRequired": "basic",
            "name": "Cases",
          },
        ]
      `);
    });
  });
});
