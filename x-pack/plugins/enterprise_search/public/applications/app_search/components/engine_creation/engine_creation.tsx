/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useLocation } from 'react-router-dom';

import { Location } from 'history';
import { useActions, useValues } from 'kea';

import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiCheckableCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormFieldset,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { docLinks } from '../../../shared/doc_links';
import { parseQueryParams } from '../../../shared/query_params';
import { ENGINES_TITLE } from '../engines';
import { AppSearchPageTemplate } from '../layout';

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
import { EngineCreationLogic, EngineCreationSteps } from './engine_creation_logic';
import { SearchIndexSelectable } from './search_index_selectable';
import { SelectEngineType } from './select_engine_type';
import { ConfigureAppSearchEngine } from './configure_app_search_engine';

export const EngineCreation: React.FC = () => {
  const { search } = useLocation() as Location;
  const { method } = parseQueryParams(search);

  const { name, rawName, language, isLoading, engineType, isSubmitDisabled, currentEngineCreationStep } =
    useValues(EngineCreationLogic);
  const { setIngestionMethod, setLanguage, setRawName, submitEngine, setEngineType, setCreationStep } =
    useActions(EngineCreationLogic);

  useEffect(() => {
    if (typeof method === 'string') {
      setIngestionMethod(method);
    }
  }, []);

  return (
    <AppSearchPageTemplate
      pageChrome={[ENGINES_TITLE, ENGINE_CREATION_TITLE]}
      pageHeader={{ pageTitle: ENGINE_CREATION_TITLE }}
      data-test-subj="EngineCreation"
    >
      {currentEngineCreationStep === EngineCreationSteps.SelectStep && (
        <SelectEngineType
          selectedEngineType={engineType}
          setAppSearchEngineType={ () => { setEngineType('appSearch')}}
          setElasticsearchEngineType={ () => { setEngineType('elasticsearch')}}
          setConfigurationStep={ () => { setCreationStep(EngineCreationSteps.ConfigureStep)}}
        />
      )}
      {currentEngineCreationStep === EngineCreationSteps.ConfigureStep && engineType === 'appSearch' && (
        <ConfigureAppSearchEngine
          name={name}
          rawName={rawName}
          language={language}
          isLoading={isLoading}
          isSubmitDisabled={isSubmitDisabled}
          submitEngine={submitEngine}
          setRawName={setRawName}
          setLanguage={setLanguage}
        />
      )}
      {currentEngineCreationStep === EngineCreationSteps.ConfigureStep && engineType === 'elasticsearch' && (
        <> Elasticsearch engine configure step</>
      )}
      {currentEngineCreationStep === EngineCreationSteps.ReviewStep && (
        <>Review Step</>
      )}
    </AppSearchPageTemplate>
  );
};
