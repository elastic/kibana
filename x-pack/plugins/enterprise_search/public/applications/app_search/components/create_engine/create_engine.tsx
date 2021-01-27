/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiForm,
  EuiFlexGroup,
  EuiFormRow,
  EuiFlexItem,
  EuiFieldText,
  EuiSelect,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiButton,
  EuiPanel,
  EuiSelectOption,
} from '@elastic/eui';
import { useActions, useValues } from 'kea';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { FlashMessages } from '../../../shared/flash_messages';

import {
  ALLOWED_CHARS_NOTE,
  CREATE_ENGINE_FORM_ENGINE_LANGUAGE_LABEL,
  CREATE_ENGINE_FORM_ENGINE_NAME_LABEL,
  CREATE_ENGINE_FORM_ENGINE_NAME_PLACEHOLDER,
  CREATE_ENGINE_FORM_SUBMIT_BUTTON_LABEL,
  CREATE_ENGINE_FORM_TITLE,
  CREATE_ENGINE_TITLE,
  getSanitizedNameNote,
} from './constants';
import { CreateEngineLogic } from './create_engine_logic';

export const CreateEngine: React.FC = () => {
  const { name, rawName, language } = useValues(CreateEngineLogic);
  const { setLanguage, setRawName, submitEngine } = useActions(CreateEngineLogic);

  // TODO these need to come from AppLogic and/or the Enterprise Search server
  const supportedLanguages: EuiSelectOption[] = [
    { text: 'Universal', value: 'Universal' },
    { text: 'English', value: 'English' },
  ];

  return (
    <div data-test-subj="CreateEngine">
      <SetPageChrome trail={[CREATE_ENGINE_TITLE]} />
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>{CREATE_ENGINE_TITLE}</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <FlashMessages />
      <EuiPanel>
        <EuiForm>
          <form
            data-test-subj="CreateEngineForm"
            onSubmit={(e) => {
              e.preventDefault();
              submitEngine();
            }}
          >
            <EuiTitle>
              <EuiText>{CREATE_ENGINE_FORM_TITLE}</EuiText>
            </EuiTitle>
            <EuiSpacer />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  label={CREATE_ENGINE_FORM_ENGINE_NAME_LABEL}
                  helpText={rawName !== name ? getSanitizedNameNote(name) : ALLOWED_CHARS_NOTE}
                  fullWidth={true}
                >
                  <EuiFieldText
                    name="engine-name"
                    value={rawName}
                    onChange={(event) => setRawName(event.currentTarget.value)}
                    autoComplete="off"
                    fullWidth={true}
                    data-test-subj="CreateEngineNameInput"
                    placeholder={CREATE_ENGINE_FORM_ENGINE_NAME_PLACEHOLDER}
                    autoFocus={true}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow label={CREATE_ENGINE_FORM_ENGINE_LANGUAGE_LABEL}>
                  <EuiSelect
                    name="engine-language"
                    value={language}
                    options={supportedLanguages}
                    data-test-subj="CreateEngineLanguageInput"
                    onChange={(event) => setLanguage(event.target.value)}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <EuiButton type="submit" data-test-subj="NewEngineSubmitButton" fill color="secondary">
              {CREATE_ENGINE_FORM_SUBMIT_BUTTON_LABEL}
            </EuiButton>
          </form>
        </EuiForm>
      </EuiPanel>
    </div>
  );
};
