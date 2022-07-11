/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiPanel,
  EuiStepsHorizontal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiSpacer,
  EuiFormRow,
  EuiTitle,
  EuiFieldText,
  EuiSelect,
} from '@elastic/eui';

import { EngineCreationLogic, EngineCreationSteps } from './engine_creation_logic';

import {
  ENGINE_CREATION_FORM_ENGINE_NAME_LABEL,
  SANITIZED_NAME_NOTE,
  ALLOWED_CHARS_NOTE,
  ENGINE_CREATION_FORM_TITLE,
  ENGINE_CREATION_FORM_ENGINE_NAME_PLACEHOLDER,
  ENGINE_CREATION_FORM_ENGINE_LANGUAGE_LABEL,
  SUPPORTED_LANGUAGES,
  ENGINE_CREATION_FORM_SUBMIT_BUTTON_LABEL,
} from './constants';

export const ConfigureAppSearchEngine: React.FC = () => {
  const { isLoading, isSubmitDisabled, language, name, rawName } =
    useValues(EngineCreationLogic);
  const { setCreationStep, setLanguage, setRawName, submitEngine } =
    useActions(EngineCreationLogic);

  return (
    <>
      <EuiStepsHorizontal
        steps={[
          {
            title: 'Search engine type',
            status: 'complete',
            onClick: () => {
              setCreationStep(EngineCreationSteps.SelectStep);
            },
          },
          {
            title: 'Configuration',
            status: 'current',
            onClick: () => {},
          },
          {
            title: 'Finish',
            status: 'disabled',
            onClick: () => {},
          },
        ]}
      />
      <EuiPanel hasBorder>
        <EuiForm
          component="form"
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
            disabled={isSubmitDisabled}
            isLoading={isLoading}
            type="submit"
            data-test-subj="NewEngineSubmitButton"
            color="success"
            fill
          >
            {ENGINE_CREATION_FORM_SUBMIT_BUTTON_LABEL}
          </EuiButton>
        </EuiForm>
      </EuiPanel>
    </>
  );
};
