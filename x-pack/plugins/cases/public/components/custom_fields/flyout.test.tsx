/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { CustomFieldFlyout } from './flyout';
import { customFieldsConfigurationMock } from '../../containers/mock';
import { MAX_CUSTOM_FIELD_LABEL_LENGTH } from '../../../common/constants';
import * as i18n from './translations';

// FLAKY: https://github.com/elastic/kibana/issues/174285
// FLAKY: https://github.com/elastic/kibana/issues/174286
// FLAKY: https://github.com/elastic/kibana/issues/174287
// FLAKY: https://github.com/elastic/kibana/issues/174288
// FLAKY: https://github.com/elastic/kibana/issues/174289
describe.skip('CustomFieldFlyout ', () => {
  let appMockRender: AppMockRenderer;

  const props = {
    onCloseFlyout: jest.fn(),
    onSaveField: jest.fn(),
    isLoading: false,
    disabled: false,
    customField: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRender.render(<CustomFieldFlyout {...props} />);

    expect(screen.getByTestId('custom-field-flyout-header')).toBeInTheDocument();
    expect(screen.getByTestId('custom-field-flyout-cancel')).toBeInTheDocument();
    expect(screen.getByTestId('custom-field-flyout-save')).toBeInTheDocument();
  });

  it('calls onSaveField on save field', async () => {
    appMockRender.render(<CustomFieldFlyout {...props} />);

    userEvent.paste(screen.getByTestId('custom-field-label-input'), 'Summary');

    userEvent.click(screen.getByTestId('text-custom-field-options'));

    userEvent.click(screen.getByTestId('custom-field-flyout-save'));

    await waitFor(() => {
      expect(props.onSaveField).toBeCalledWith({
        key: expect.anything(),
        label: 'Summary',
        required: true,
        type: 'text',
      });
    });
  });

  it('shows error if field label is too long', async () => {
    appMockRender.render(<CustomFieldFlyout {...props} />);

    const message = 'z'.repeat(MAX_CUSTOM_FIELD_LABEL_LENGTH + 1);

    userEvent.type(screen.getByTestId('custom-field-label-input'), message);

    await waitFor(() => {
      expect(
        screen.getByText(i18n.MAX_LENGTH_ERROR('field label', MAX_CUSTOM_FIELD_LABEL_LENGTH))
      ).toBeInTheDocument();
    });
  });

  it('calls onSaveField with serialized data', async () => {
    appMockRender.render(<CustomFieldFlyout {...props} />);

    userEvent.paste(screen.getByTestId('custom-field-label-input'), 'Summary');

    userEvent.click(screen.getByTestId('custom-field-flyout-save'));

    await waitFor(() => {
      expect(props.onSaveField).toBeCalledWith({
        key: expect.anything(),
        label: 'Summary',
        required: false,
        type: 'text',
      });
    });
  });

  it('does not call onSaveField when error', async () => {
    appMockRender.render(<CustomFieldFlyout {...props} />);

    userEvent.click(screen.getByTestId('custom-field-flyout-save'));

    await waitFor(() => {
      expect(screen.getByText(i18n.REQUIRED_FIELD(i18n.FIELD_LABEL))).toBeInTheDocument();
    });

    expect(props.onSaveField).not.toBeCalled();
  });

  it('calls onCloseFlyout on cancel', async () => {
    appMockRender.render(<CustomFieldFlyout {...props} />);

    userEvent.click(screen.getByTestId('custom-field-flyout-cancel'));

    await waitFor(() => {
      expect(props.onCloseFlyout).toBeCalled();
    });
  });

  it('calls onCloseFlyout on close', async () => {
    appMockRender.render(<CustomFieldFlyout {...props} />);

    userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    await waitFor(() => {
      expect(props.onCloseFlyout).toBeCalled();
    });
  });

  it('renders flyout with data when customField value exist', async () => {
    appMockRender.render(
      <CustomFieldFlyout {...{ ...props, customField: customFieldsConfigurationMock[0] }} />
    );

    expect(await screen.findByTestId('custom-field-label-input')).toHaveAttribute(
      'value',
      customFieldsConfigurationMock[0].label
    );
    expect(await screen.findByTestId('custom-field-type-selector')).toHaveAttribute('disabled');
    expect(await screen.findByTestId('text-custom-field-options')).toHaveAttribute('checked');
  });
});
