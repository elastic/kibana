/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiForm,
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiButton,
  EuiPanel,
} from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

import {
  META_ENGINE_CREATION_FORM_DOCUMENTATION_DESCRIPTION,
  META_ENGINE_CREATION_FORM_META_ENGINE_DESCRIPTION,
  META_ENGINE_CREATION_FORM_SUBMIT_BUTTON_LABEL,
  META_ENGINE_CREATION_FORM_TITLE,
  META_ENGINE_CREATION_TITLE,
} from './constants';

export const MetaEngineCreation: React.FC = () => {
  return (
    <div data-test-subj="MetaEngineCreation">
      <SetPageChrome trail={[META_ENGINE_CREATION_TITLE]} />
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>{META_ENGINE_CREATION_TITLE}</h1>
          </EuiTitle>
          <EuiText>{META_ENGINE_CREATION_FORM_META_ENGINE_DESCRIPTION}</EuiText>
          <EuiText>{META_ENGINE_CREATION_FORM_DOCUMENTATION_DESCRIPTION}</EuiText>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageBody>
        <FlashMessages />
        <EuiPanel>
          <EuiForm>
            <form
              data-test-subj="MetaEngineCreationForm"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <EuiTitle>
                <EuiText>{META_ENGINE_CREATION_FORM_TITLE}</EuiText>
              </EuiTitle>
              <EuiSpacer />
              <EuiButton
                disabled
                type="submit"
                data-test-subj="NewMetaEngineSubmitButton"
                fill
                color="secondary"
              >
                {META_ENGINE_CREATION_FORM_SUBMIT_BUTTON_LABEL}
              </EuiButton>
            </form>
          </EuiForm>
        </EuiPanel>
      </EuiPageBody>
    </div>
  );
};
