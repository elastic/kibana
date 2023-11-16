/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { render, fireEvent, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import EmailParamsFields from './email_params';
import { getIsExperimentalFeatureEnabled } from '../../common/get_experimental_features';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));
jest.mock('../../common/get_experimental_features');

const useKibanaMock = useKibana as jest.Mock;
const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      triggersActionsUi: triggersActionsUiMock.createStart(),
    },
  });
};

describe('EmailParamsFields renders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);
  });

  test('all params fields is rendered', async () => {
    const actionParams = {
      cc: [],
      bcc: [],
      to: ['test@test.com'],
      subject: 'test',
      message: 'test message',
    };

    render(
      <IntlProvider locale="en">
        <EmailParamsFields
          actionParams={actionParams}
          errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
          editAction={() => {}}
          defaultMessage={'Some default message'}
          index={0}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('toEmailAddressInput')).toBeVisible();
    expect(screen.getByTestId('toEmailAddressInput').textContent).toStrictEqual('test@test.com');
    expect(screen.getByTestId('subjectInput')).toBeVisible();
    expect(await screen.findByTestId('messageTextArea')).toBeVisible();
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
    const { rerender } = render(
      <IntlProvider locale="en">
        <EmailParamsFields
          actionParams={actionParams}
          errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
          editAction={editAction}
          defaultMessage={'Some default message'}
          index={0}
        />
      </IntlProvider>
    );

    expect(editAction).toHaveBeenCalledWith('message', 'Some default message', 0);

    // simulate value being updated
    const valueToSimulate = 'some new value';
    fireEvent.change(screen.getByTestId('messageTextArea'), {
      target: { value: valueToSimulate },
    });

    expect(editAction).toHaveBeenCalledWith('message', valueToSimulate, 0);

    rerender(
      <IntlProvider locale="en">
        <EmailParamsFields
          actionParams={{
            ...actionParams,
            message: valueToSimulate,
          }}
          errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
          editAction={editAction}
          defaultMessage={'Some default message'}
          index={0}
        />
      </IntlProvider>
    );

    rerender(
      <IntlProvider locale="en">
        <EmailParamsFields
          actionParams={{
            ...actionParams,
            message: valueToSimulate,
          }}
          errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
          editAction={editAction}
          defaultMessage={'Some different default message'}
          index={0}
        />
      </IntlProvider>
    );

    expect(editAction).not.toHaveBeenCalledWith('message', 'Some different default message', 0);
  });

  test('when useDefaultMessage is set to true and the default message changes, the underlying message is replaced with the default message', () => {
    const actionParams = {
      cc: [],
      bcc: [],
      to: ['test@test.com'],
      subject: 'test',
    };

    const editAction = jest.fn();
    const wrapper = mountWithIntl(
      <EmailParamsFields
        actionParams={{ ...actionParams, message: 'not the default message' }}
        errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
        editAction={editAction}
        defaultMessage={'Some default message'}
        index={0}
      />
    );
    const text = wrapper.find('[data-test-subj="messageTextArea"]').first().text();
    expect(text).toEqual('not the default message');

    wrapper.setProps({
      useDefaultMessage: true,
      defaultMessage: 'Some different default message',
    });

    expect(editAction).toHaveBeenCalledWith('message', 'Some different default message', 0);
  });

  test('when useDefaultMessage is set to false and the default message changes, the underlying message is not changed', () => {
    const actionParams = {
      cc: [],
      bcc: [],
      to: ['test@test.com'],
      subject: 'test',
    };

    const editAction = jest.fn();
    const wrapper = mountWithIntl(
      <EmailParamsFields
        actionParams={{ ...actionParams, message: 'not the default message' }}
        errors={{ to: [], cc: [], bcc: [], subject: [], message: [] }}
        editAction={editAction}
        defaultMessage={'Some default message'}
        index={0}
      />
    );
    const text = wrapper.find('[data-test-subj="messageTextArea"]').first().text();
    expect(text).toEqual('not the default message');

    wrapper.setProps({
      useDefaultMessage: false,
      defaultMessage: 'Some different default message',
    });

    expect(editAction).not.toHaveBeenCalled();
  });
});
