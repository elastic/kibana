/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiPortal,
  EuiFormRow,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiForm,
  EuiTitle,
} from '@elastic/eui';

import { CLOSE_BUTTON_LABEL, SAVE_BUTTON_LABEL } from '../../../../shared/constants';
import { FlashMessages } from '../../../../shared/flash_messages';

import { ApiKeysLogic } from '../api_keys_logic';
import {
  API_KEY_FLYOUT_TITLE,
  API_KEY_FORM_LABEL,
  API_KEY_FORM_HELP_TEXT,
  API_KEY_NAME_PLACEHOLDER,
} from '../constants';

export const ApiKeyFlyout: React.FC = () => {
  const { setNameInputBlurred, setApiKeyName, onApiFormSubmit, hideApiKeyForm } =
    useActions(ApiKeysLogic);
  const {
    activeApiToken: { name },
    activeApiTokenRawName: rawName,
  } = useValues(ApiKeysLogic);

  return (
    <EuiPortal>
      <EuiFlyout onClose={hideApiKeyForm} hideCloseButton ownFocus size="s">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>{API_KEY_FLYOUT_TITLE}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <FlashMessages />
          <EuiForm
            onSubmit={(e) => {
              e.preventDefault();
              onApiFormSubmit();
            }}
            component="form"
          >
            <EuiFormRow
              label={API_KEY_FORM_LABEL}
              helpText={!!name && name !== rawName ? API_KEY_FORM_HELP_TEXT(name) : ''}
              fullWidth
            >
              <EuiFieldText
                name="raw_name"
                id="raw_name"
                placeholder={API_KEY_NAME_PLACEHOLDER}
                data-test-subj="APIKeyField"
                value={rawName}
                onChange={(e) => setApiKeyName(e.target.value)}
                onBlur={() => setNameInputBlurred(true)}
                autoComplete="off"
                maxLength={64}
                required
                fullWidth
                autoFocus
              />
            </EuiFormRow>
          </EuiForm>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={hideApiKeyForm}>
                {CLOSE_BUTTON_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={onApiFormSubmit} fill data-test-subj="APIKeyActionButton">
                {SAVE_BUTTON_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
};
