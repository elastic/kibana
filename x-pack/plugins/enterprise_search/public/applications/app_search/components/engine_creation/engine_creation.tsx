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
import { EngineCreationLogic } from './engine_creation_logic';
import { SearchIndexSelectable } from './search_index_selectable';

export const EngineCreation: React.FC = () => {
  const { search } = useLocation() as Location;
  const { method } = parseQueryParams(search);

  const { name, rawName, language, isLoading, engineType, isSubmitDisabled } =
    useValues(EngineCreationLogic);
  const { setIngestionMethod, setLanguage, setRawName, submitEngine, setEngineType } =
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
          <EuiPanel color="subdued">
            <EuiAccordion id="advancedSettingsAccordion" buttonContent="Advanced settings">
              <EuiSpacer />
              <EuiFormFieldset
                legend={{
                  children: (
                    <EuiTitle size="xs">
                      <span>
                        {i18n.translate('xpack.enterpriseSearch.engineCreation.engineTypeLabel', {
                          defaultMessage:
                            "Select how you'd like to manage the index for this engine",
                        })}
                      </span>
                    </EuiTitle>
                  ),
                }}
              >
                <EuiFlexGroup direction="column" gutterSize="s">
                  <EuiFlexItem>
                    <EuiCheckableCard
                      id="checkableCardId__appSearchManaged"
                      name="engineTypeSelection"
                      onChange={() => setEngineType('appSearch')}
                      checked={engineType === 'appSearch'}
                      label={
                        <>
                          <EuiTitle size="xxs">
                            <span>
                              {i18n.translate(
                                'xpack.enterpriseSearch.engineCreation.appSearchManagedLabel',
                                { defaultMessage: 'I want App Search to ingest and manage my data' }
                              )}
                            </span>
                          </EuiTitle>
                          <EuiSpacer size="xs" />
                          <EuiText size="s" color="subdued">
                            <p>
                              {i18n.translate(
                                'xpack.enterpriseSearch.engineCreation.appSearchManagedDescription',
                                {
                                  defaultMessage:
                                    'Create and engine and add documents via Web Crawler, API, or JSON file.',
                                }
                              )}
                            </p>
                          </EuiText>
                        </>
                      }
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiCheckableCard
                      id="checkableCardId__elasticsearchManaged"
                      name="engineTypeSelection"
                      onChange={() => setEngineType('elasticsearch')}
                      checked={engineType === 'elasticsearch'}
                      label={
                        <>
                          <EuiBadge color="success" iconType="cheer">
                            {i18n.translate(
                              'xpack.enterpriseSearch.engineCreation.elasticsearchTechPreviewBadge',
                              { defaultMessage: 'Technical Preview' }
                            )}
                          </EuiBadge>
                          <EuiSpacer size="xs" />
                          <EuiTitle size="xxs">
                            <span>
                              {i18n.translate(
                                'xpack.enterpriseSearch.engineCreation.elasticsearchManagedLabel',
                                { defaultMessage: 'I want to manage my data with Elasticsearch' }
                              )}
                            </span>
                          </EuiTitle>
                          <EuiSpacer size="xs" />
                          <EuiText size="s" color="subdued">
                            <p>
                              {i18n.translate(
                                'xpack.enterpriseSearch.engineCreation.elasticsearchIndexedLabel',
                                {
                                  defaultMessage:
                                    'Create an engine based on data managed in an Elasticsearch index.',
                                }
                              )}
                            </p>
                            <p>
                              <small>
                                <EuiLink
                                  href={docLinks.appSearchElasticsearchIndexedEngines}
                                  target="_blank"
                                >
                                  {i18n.translate(
                                    'xpack.enterpriseSearch.engineCreation.elasticsearchIndexedLink',
                                    {
                                      defaultMessage:
                                        'Learn more about using an existing Elasticsearch index',
                                    }
                                  )}
                                </EuiLink>
                              </small>
                            </p>
                          </EuiText>
                        </>
                      }
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormFieldset>
              <EuiSpacer />
              {engineType === 'elasticsearch' && <SearchIndexSelectable />}
            </EuiAccordion>
          </EuiPanel>
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
    </AppSearchPageTemplate>
  );
};
