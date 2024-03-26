/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CasesConnectorFields } from './cases_connector';
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectorFormTestProvider } from '../connector_test_utils';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');

describe('CasesActionConnectorFields', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('connector validation succeeds when connector config is valid', async () => {
    const actionConnector = {
      actionTypeId: '.cases',
      name: 'cases',
      config: {},
      secrets: {},
      isDeprecated: false,
    };

    const { getByTestId } = render(
      <ConnectorFormTestProvider connector={actionConnector} onSubmit={onSubmit}>
        <CasesConnectorFields
          readOnly={false}
          isEdit={false}
          registerPreSubmitValidator={() => {}}
        />
      </ConnectorFormTestProvider>
    );

    await act(async () => {
      userEvent.click(getByTestId('form-test-provide-submit'));
    });

    waitFor(() => {
      expect(onSubmit).toBeCalledWith({
        data: {
          actionTypeId: '.cases',
          name: 'cases',
          config: {},
          secrets: {},
          isDeprecated: false,
        },
        isValid: true,
      });
    });
  });
});
