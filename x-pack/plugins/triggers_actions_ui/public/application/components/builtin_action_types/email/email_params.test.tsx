/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import EmailParamsFields from './email_params';

describe('EmailParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      cc: [],
      bcc: [],
      to: ['test@test.com'],
      subject: 'test',
      message: 'test message',
    };

    const wrapper = mountWithIntl(
      <EmailParamsFields
        actionParams={actionParams}
        errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
        editAction={() => {}}
        index={0}
      />
    );

    expect(wrapper.find('[data-test-subj="toEmailAddressInput"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="toEmailAddressInput"]').first().prop('selectedOptions')
    ).toStrictEqual([{ label: 'test@test.com' }]);
    expect(wrapper.find('[data-test-subj="subjectInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="messageTextArea"]').length > 0).toBeTruthy();
  });

  test('message param field is rendered with default value if not set', () => {
    const actionParams = {
      cc: [],
      bcc: [],
      to: ['test@test.com'],
      subject: 'test',
    };

    const editAction = jest.fn();
    mountWithIntl(
      <EmailParamsFields
        actionParams={actionParams}
        errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
        editAction={editAction}
        defaultMessage={'Some default message'}
        index={0}
      />
    );

    expect(editAction).toHaveBeenCalledWith('message', 'Some default message', 0);
  });

  test('when the default message changes, so is the underlying message if it was set by the previous default', () => {
    const actionParams = {
      cc: [],
      bcc: [],
      to: ['test@test.com'],
      subject: 'test',
    };

    const editAction = jest.fn();
    const wrapper = mountWithIntl(
      <EmailParamsFields
        actionParams={actionParams}
        errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
        editAction={editAction}
        defaultMessage={'Some default message'}
        index={0}
      />
    );

    expect(editAction).toHaveBeenCalledWith('message', 'Some default message', 0);

    wrapper.setProps({
      defaultMessage: 'Some different default message',
    });

    expect(editAction).toHaveBeenCalledWith('message', 'Some different default message', 0);
  });

  test('when the default message changes, it doesnt change the underlying message if it wasnt set by a previous default', () => {
    const actionParams = {
      cc: [],
      bcc: [],
      to: ['test@test.com'],
      subject: 'test',
    };

    const editAction = jest.fn();
    const wrapper = mountWithIntl(
      <EmailParamsFields
        actionParams={actionParams}
        errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
        editAction={editAction}
        defaultMessage={'Some default message'}
        index={0}
      />
    );

    expect(editAction).toHaveBeenCalledWith('message', 'Some default message', 0);

    // simulate value being updated
    const valueToSimulate = 'some new value';
    wrapper
      .find('[data-test-subj="messageTextArea"]')
      .first()
      .simulate('change', { target: { value: valueToSimulate } });
    expect(editAction).toHaveBeenCalledWith('message', valueToSimulate, 0);
    wrapper.setProps({
      actionParams: {
        ...actionParams,
        message: valueToSimulate,
      },
    });

    // simulate default changing
    wrapper.setProps({
      defaultMessage: 'Some different default message',
    });

    expect(editAction).not.toHaveBeenCalledWith('message', 'Some different default message', 0);
  });
});
