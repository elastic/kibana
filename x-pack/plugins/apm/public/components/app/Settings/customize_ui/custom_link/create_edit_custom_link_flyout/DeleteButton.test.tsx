/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { act } from 'react-dom/test-utils';
import { EuiThemeProvider } from '../../../../../../../../../../src/plugins/kibana_react/common';
import { MockApmAppContextProvider } from '../../../../../../context/mock_apm_app/mock_apm_app_context';
import * as apmApi from '../../../../../../services/rest/createCallApmApi';
import { DeleteButton } from './DeleteButton';

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <EuiThemeProvider>
      <MockApmAppContextProvider>{children}</MockApmAppContextProvider>
    </EuiThemeProvider>
  );
}

describe('DeleteButton', () => {
  beforeAll(() => {
    jest.spyOn(apmApi, 'callApmApi').mockResolvedValue({});
  });

  it('deletes a custom link', async () => {
    const onDeleteMock = jest.fn();
    const { getByText } = render(
      <DeleteButton onDelete={onDeleteMock} customLinkId="1" />,
      { wrapper: Wrapper }
    );

    await act(async () => {
      fireEvent.click(getByText('Delete'));
    });

    expect(onDeleteMock).toHaveBeenCalledTimes(1);
  });
});
