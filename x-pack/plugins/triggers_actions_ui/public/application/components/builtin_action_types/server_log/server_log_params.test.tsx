/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { ServerLogLevelOptions } from '../types';
import ServerLogParamsFields from './server_log_params';

describe('ServerLogParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const editAction = jest.fn();
    const actionParams = {
      level: ServerLogLevelOptions.TRACE,
      message: 'test',
    };
    const wrapper = mountWithIntl(
      <ServerLogParamsFields
        actionParams={actionParams}
        errors={{ message: [] }}
        editAction={editAction}
        index={0}
        defaultMessage={'test default message'}
      />
    );
    expect(editAction).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test-subj="loggingLevelSelect"]').length > 0).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="loggingLevelSelect"]').first().prop('value')
    ).toStrictEqual('trace');
    expect(wrapper.find('[data-test-subj="messageTextArea"]').length > 0).toBeTruthy();
  });

  test('level param field is rendered with default value if not selected', () => {
    const actionParams = {
      message: 'test message',
    };
    const editAction = jest.fn();

    mountWithIntl(
      <ServerLogParamsFields
        actionParams={actionParams}
        errors={{ message: [] }}
        editAction={editAction}
        index={0}
      />
    );

    expect(editAction).toHaveBeenCalledWith('level', 'info', 0);
  });

  test('message param field is rendered with default value if not set', () => {
    const actionParams = {
      level: ServerLogLevelOptions.TRACE,
    };

    const editAction = jest.fn();

    mountWithIntl(
      <ServerLogParamsFields
        actionParams={actionParams}
        defaultMessage={'Some default message'}
        errors={{ message: [] }}
        editAction={editAction}
        index={0}
      />
    );

    expect(editAction).toHaveBeenCalledWith('message', 'Some default message', 0);
  });

  test('when the default message changes, so is the underlying message if it was set by the previous default', () => {
    const actionParams = {
      level: ServerLogLevelOptions.TRACE,
    };

    const editAction = jest.fn();
    const wrapper = mountWithIntl(
      <ServerLogParamsFields
        actionParams={actionParams}
        defaultMessage={'Some default message'}
        errors={{ message: [] }}
        editAction={editAction}
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
      level: ServerLogLevelOptions.TRACE,
    };

    const editAction = jest.fn();
    const wrapper = mountWithIntl(
      <ServerLogParamsFields
        actionParams={actionParams}
        defaultMessage={'Some default message'}
        errors={{ message: [] }}
        editAction={editAction}
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
