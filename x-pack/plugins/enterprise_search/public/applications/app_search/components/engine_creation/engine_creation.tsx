/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiForm,
  EuiFlexGroup,
  EuiFormRow,
  EuiFlexItem,
  EuiFieldText,
  EuiSelect,
  EuiPageHeader,
  EuiPageContent,
  EuiSpacer,
  EuiTitle,
  EuiButton,
} from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

import {
  ALLOWED_CHARS_NOTE,
  ENGINE_CREATION_FORM_ENGINE_LANGUAGE_LABEL,
  ENGINE_CREATION_FORM_ENGINE_NAME_LABEL,
  ENGINE_CREATION_FORM_ENGINE_NAME_PLACEHOLDER,
  ENGINE_CREATION_FORM_SUBMIT_BUTTON_LABEL,
  ENGINE_CREATION_FORM_TITLE,
  ENGINE_CREATION_TITLE,
  SANITIZED_NAME_NOTE,
  SUPPORTED_LANGUAGES,
} from './constants';
import { EngineCreationLogic } from './engine_creation_logic';

export const EngineCreation: React.FC = () => {
  const { name, rawName, language, isLoading } = useValues(EngineCreationLogic);
  const { setLanguage, setRawName, submitEngine } = useActions(EngineCreationLogic);

  return (
    <div data-test-subj="EngineCreation">
      <SetPageChrome trail={[ENGINE_CREATION_TITLE]} />
      <EuiPageHeader pageTitle={ENGINE_CREATION_TITLE} />
      <FlashMessages />
      <EuiPageContent hasBorder>
        <EuiForm>
          <form
            data-test-subj="EngineCreationForm"
            onSubmit={(e) => {
              e.preventDefault();
              submitEngine();
            }}
          >
            <EuiTitle>
              <h2>{ENGINE_CREATION_FORM_TITLE}</h2>
            </EuiTitle>
            <EuiSpacer />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  data-test-subj="EngineCreationNameFormRow"
                  label={ENGINE_CREATION_FORM_ENGINE_NAME_LABEL}
                  helpText={
                    name.length > 0 && rawName !== name ? (
                      <>
                        {SANITIZED_NAME_NOTE} <strong>{name}</strong>
                      </>
                    ) : (
                      ALLOWED_CHARS_NOTE
                    )
                  }
                  fullWidth
                >
                  <EuiFieldText
                    name="engine-name"
                    value={rawName}
                    onChange={(event) => setRawName(event.currentTarget.value)}
                    autoComplete="off"
                    fullWidth
                    data-test-subj="EngineCreationNameInput"
                    placeholder={ENGINE_CREATION_FORM_ENGINE_NAME_PLACEHOLDER}
                    autoFocus
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow label={ENGINE_CREATION_FORM_ENGINE_LANGUAGE_LABEL}>
                  <EuiSelect
                    name="engine-language"
                    value={language}
                    options={SUPPORTED_LANGUAGES}
                    data-test-subj="EngineCreationLanguageInput"
                    onChange={(event) => setLanguage(event.currentTarget.value)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <EuiButton
              disabled={name.length === 0}
              isLoading={isLoading}
              type="submit"
              data-test-subj="NewEngineSubmitButton"
              color="secondary"
              fill
            >
              {ENGINE_CREATION_FORM_SUBMIT_BUTTON_LABEL}
            </EuiButton>
          </form>
        </EuiForm>
      </EuiPageContent>
    </div>
  );
};
