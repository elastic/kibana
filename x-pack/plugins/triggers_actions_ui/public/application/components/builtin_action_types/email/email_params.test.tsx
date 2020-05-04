/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '../index';
import { ActionTypeModel, ActionParamsProps } from '../../../../types';
import { EmailActionParams } from '../types';

const ACTION_TYPE_ID = '.email';
let actionTypeModel: ActionTypeModel;

beforeAll(() => {
  const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
  registerBuiltInActionTypes({ actionTypeRegistry });
  const getResult = actionTypeRegistry.get(ACTION_TYPE_ID);
  if (getResult !== null) {
    actionTypeModel = getResult;
  }
});

describe('EmailParamsFields renders', () => {
  test('all params fields is rendered', () => {
    expect(actionTypeModel.actionParamsFields).not.toBeNull();
    if (!actionTypeModel.actionParamsFields) {
      return;
    }
    const ParamsFields = actionTypeModel.actionParamsFields as FunctionComponent<
      ActionParamsProps<EmailActionParams>
    >;
    const actionParams = {
      cc: [],
      bcc: [],
      to: ['test@test.com'],
      subject: 'test',
      message: 'test message',
    };
    const wrapper = mountWithIntl(
      <ParamsFields
        actionParams={actionParams}
        errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="toEmailAddressInput"]').length > 0).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="toEmailAddressInput"]')
        .first()
        .prop('selectedOptions')
    ).toStrictEqual([{ label: 'test@test.com' }]);
    expect(wrapper.find('[data-test-subj="emailSubjectInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="emailMessageInput"]').length > 0).toBeTruthy();
  });
});
