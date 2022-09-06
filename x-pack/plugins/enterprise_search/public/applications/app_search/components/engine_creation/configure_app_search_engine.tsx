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
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
  EuiTextAlign,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  ENGINE_CREATION_FORM_ENGINE_NAME_LABEL,
  SANITIZED_NAME_NOTE,
  ALLOWED_CHARS_NOTE,
  ENGINE_CREATION_FORM_TITLE,
  ENGINE_CREATION_FORM_ENGINE_NAME_PLACEHOLDER,
  ENGINE_CREATION_FORM_ENGINE_LANGUAGE_LABEL,
  SUPPORTED_LANGUAGES,
} from './constants';

import { EngineCreationLogic, EngineCreationSteps } from './engine_creation_logic';

export const ConfigureAppSearchEngine: React.FC = () => {
  const { isSubmitDisabled, language, name, rawName } = useValues(EngineCreationLogic);
  const { setCreationStep, setLanguage, setRawName, submitEngine } =
    useActions(EngineCreationLogic);

  return (
    <div className="entSearch__createEngineLayout">
      <EuiStepsHorizontal
        steps={[
          {
            onClick: () => setCreationStep(EngineCreationSteps.SelectStep),
            status: 'complete',
            title: i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.steps.searchEngineType.label',
              {
                defaultMessage: 'Search engine type',
              }
            ),
          },
          {
            onClick: () => {},
            status: 'current',
            title: i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.steps.configuration.label',
              {
                defaultMessage: 'Configuration',
              }
            ),
          },
          {
            onClick: () => {},
            status: 'disabled',
            title: i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.steps.finish.label',
              {
                defaultMessage: 'Finish',
              }
            ),
          },
        ]}
      />

      <EuiSpacer />

      <EuiPanel hasBorder paddingSize="l">
        <EuiForm
          component="form"
          data-test-subj="EngineCreationForm"
          onSubmit={(e) => {
            e.preventDefault();
            submitEngine();
          }}
        >
          <EuiTextAlign textAlign="center">
            <EuiTitle>
              <h2>{ENGINE_CREATION_FORM_TITLE}</h2>
            </EuiTitle>
          </EuiTextAlign>

          <EuiSpacer />

          <EuiText color="subdued" textAlign="center">
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.appSearch.description',
              {
                defaultMessage:
                  'Provide a unique name and an optional language choice for your App Search engine.',
              }
            )}
          </EuiText>

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

          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="NewEngineBackButton"
                color="primary"
                iconType="arrowLeft"
                onClick={() => {
                  setCreationStep(EngineCreationSteps.SelectStep);
                }}
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engineCreation.form.backButton.label',
                  {
                    defaultMessage: 'Back',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                disabled={isSubmitDisabled}
                type="submit"
                data-test-subj="NewEngineSubmitButton"
                iconType="arrowRight"
                iconSide="right"
                fill
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engineCreation.form.continue.label',
                  {
                    defaultMessage: 'Create search engine',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiForm>
      </EuiPanel>
    </div>
  );
};
