/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiCallOut,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiForm,
  EuiFlexGroup,
  EuiFormRow,
  EuiFlexItem,
  EuiFieldText,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiButton,
} from '@elastic/eui';

import { AppLogic } from '../../app_logic';
import { ENGINES_TITLE } from '../engines';
import { AppSearchPageTemplate } from '../layout';

import {
  ALLOWED_CHARS_NOTE,
  META_ENGINE_CREATION_FORM_DOCUMENTATION_DESCRIPTION,
  META_ENGINE_CREATION_FORM_ENGINE_NAME_LABEL,
  META_ENGINE_CREATION_FORM_ENGINE_NAME_PLACEHOLDER,
  META_ENGINE_CREATION_FORM_ENGINE_SOURCE_ENGINES_LABEL,
  META_ENGINE_CREATION_FORM_MAX_SOURCE_ENGINES_WARNING_TITLE,
  META_ENGINE_CREATION_FORM_META_ENGINE_DESCRIPTION,
  META_ENGINE_CREATION_FORM_SUBMIT_BUTTON_LABEL,
  META_ENGINE_CREATION_FORM_TITLE,
  META_ENGINE_CREATION_TITLE,
  SANITIZED_NAME_NOTE,
} from './constants';
import { MetaEngineCreationLogic } from './meta_engine_creation_logic';

const engineNameToComboBoxOption = (engineName: string): EuiComboBoxOptionOption<string> => ({
  label: engineName,
});

const comboBoxOptionToEngineName = (option: EuiComboBoxOptionOption<string>): string =>
  option.label;

export const MetaEngineCreation: React.FC = () => {
  const {
    configuredLimits: {
      engine: { maxEnginesPerMetaEngine },
    },
  } = useValues(AppLogic);

  const { fetchIndexedEngineNames, setRawName, setSelectedIndexedEngineNames, submitEngine } =
    useActions(MetaEngineCreationLogic);

  const { rawName, name, indexedEngineNames, selectedIndexedEngineNames, isLoading } =
    useValues(MetaEngineCreationLogic);

  useEffect(() => {
    fetchIndexedEngineNames();
  }, []);

  return (
    <AppSearchPageTemplate
      pageChrome={[ENGINES_TITLE, META_ENGINE_CREATION_TITLE]}
      pageHeader={{
        pageTitle: META_ENGINE_CREATION_TITLE,
        description: (
          <>
            {META_ENGINE_CREATION_FORM_META_ENGINE_DESCRIPTION}
            <br />
            {META_ENGINE_CREATION_FORM_DOCUMENTATION_DESCRIPTION}
          </>
        ),
      }}
      data-test-subj="MetaEngineCreation"
    >
      <EuiPanel hasBorder>
        <EuiForm
          component="form"
          data-test-subj="MetaEngineCreationForm"
          onSubmit={(e) => {
            e.preventDefault();
            submitEngine();
          }}
        >
          <EuiTitle>
            <h2>{META_ENGINE_CREATION_FORM_TITLE}</h2>
          </EuiTitle>
          <EuiSpacer />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                data-test-subj="MetaEngineCreationNameFormRow"
                label={META_ENGINE_CREATION_FORM_ENGINE_NAME_LABEL}
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
                  fullWidth
                  data-test-subj="MetaEngineCreationNameInput"
                  placeholder={META_ENGINE_CREATION_FORM_ENGINE_NAME_PLACEHOLDER}
                  autoFocus
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiFormRow label={META_ENGINE_CREATION_FORM_ENGINE_SOURCE_ENGINES_LABEL} fullWidth>
            <EuiComboBox
              data-test-subj="MetaEngineCreationSourceEnginesInput"
              options={indexedEngineNames.map(engineNameToComboBoxOption)}
              selectedOptions={selectedIndexedEngineNames.map(engineNameToComboBoxOption)}
              onChange={(options) => {
                setSelectedIndexedEngineNames(options.map(comboBoxOptionToEngineName));
              }}
            />
          </EuiFormRow>
          {selectedIndexedEngineNames.length > maxEnginesPerMetaEngine && (
            <>
              <EuiSpacer />
              <EuiCallOut
                color="warning"
                title={META_ENGINE_CREATION_FORM_MAX_SOURCE_ENGINES_WARNING_TITLE(
                  maxEnginesPerMetaEngine
                )}
              />
            </>
          )}
          <EuiSpacer />
          <EuiButton
            disabled={
              name.length === 0 ||
              selectedIndexedEngineNames.length === 0 ||
              selectedIndexedEngineNames.length > maxEnginesPerMetaEngine
            }
            isLoading={isLoading}
            type="submit"
            data-test-subj="NewMetaEngineSubmitButton"
            color="success"
            fill
          >
            {META_ENGINE_CREATION_FORM_SUBMIT_BUTTON_LABEL}
          </EuiButton>
        </EuiForm>
      </EuiPanel>
    </AppSearchPageTemplate>
  );
};
