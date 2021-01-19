/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { MockApmPluginContextWrapper } from '../../../../../../context/apm_plugin/mock_apm_plugin_context';
import * as apmApi from '../../../../../../services/rest/createCallApmApi';
import { DeleteButton } from './DeleteButton';

describe('Delete custom link', () => {
  beforeAll(() => {
    jest.spyOn(apmApi, 'callApmApi').mockResolvedValue({});
  });
  it('deletes a custom link', async () => {
    const onDeleteMock = jest.fn();
    const { getByText } = render(
      <MockApmPluginContextWrapper>
        <DeleteButton onDelete={onDeleteMock} customLinkId="1" />
      </MockApmPluginContextWrapper>
    );
    await act(async () => {
      fireEvent.click(getByText('Delete'));
    });
    expect(onDeleteMock).toHaveBeenCalledTimes(1);
  });
});
