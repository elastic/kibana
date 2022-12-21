/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHighlight,
  EuiPanel,
  EuiSelectable,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
  EuiTextAlign,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  ALLOWED_CHARS_NOTE,
  ENGINE_CREATION_FORM_ENGINE_NAME_LABEL,
  ENGINE_CREATION_FORM_ENGINE_NAME_PLACEHOLDER,
  ENGINE_CREATION_FORM_TITLE,
  SANITIZED_NAME_NOTE,
} from './constants';

import { EngineCreationLogic, EngineCreationSteps } from './engine_creation_logic';
import { IndexStatusDetails, SearchIndexSelectableOption } from './search_index_selectable';

import './engine_creation.scss';

const renderIndexOption = (option: SearchIndexSelectableOption, searchValue: string) => {
  return (
    <>
      <EuiHighlight search={searchValue}>{option.label ?? ''}</EuiHighlight>
      <EuiSpacer size="xs" />
      <IndexStatusDetails option={option} />
    </>
  );
};

export const ConfigureElasticsearchEngine: React.FC = () => {
  const {
    aliasName,
    aliasNameErrorMessage,
    aliasRawName,
    indicesFormatted,
    isAliasAllowed,
    isAliasRequired,
    isLoading,
    isLoadingIndices,
    isSubmitDisabled,
    name,
    rawName,
    showAliasNameErrorMessages,
  } = useValues(EngineCreationLogic);
  const {
    loadIndices,
    setIsAliasAllowed,
    setAliasRawName,
    setCreationStep,
    setRawName,
    setSelectedIndex,
  } = useActions(EngineCreationLogic);

  const onChange = (options: SearchIndexSelectableOption[]) => {
    const selectedOption = options.find((option) => option.checked === 'on');
    setSelectedIndex(selectedOption?.label ?? '');

    // If this is an alias, remove the alias name. Do nothing if an option was deselected
    if (selectedOption?.alias ?? false) setAliasRawName('');

    // Set isAliasAllowed depending on if the selectedOption is an alias or not.
    // Set it to true if an option was deselected.
    setIsAliasAllowed(!selectedOption?.alias ?? true);
  };

  const aliasOptionalOrRequired = !isAliasAllowed
    ? 'Disabled'
    : isAliasRequired
    ? 'Required'
    : 'Optional';

  useEffect(() => {
    loadIndices();
  }, []);

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
            title: i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.steps.review.label',
              {
                defaultMessage: 'Review',
              }
            ),
          },
        ]}
      />

      <EuiSpacer />

      <EuiPanel hasBorder>
        <EuiForm
          component="form"
          data-test-subj="EngineCreationForm"
          onSubmit={(e) => {
            e.preventDefault();
            setCreationStep(EngineCreationSteps.ReviewStep);
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
              'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.elasticsearchIndex.description',
              {
                defaultMessage:
                  'Provide a unique name and select an index for your App Search engine.',
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
          </EuiFlexGroup>

          <EuiSpacer />

          <EuiCallOut
            size="m"
            title={i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.callout.title',
              { defaultMessage: 'App Search has index and alias name requirements' }
            )}
            iconType="iInCircle"
          >
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.callout.body',
                {
                  defaultMessage: `
                    App Search engines can only be created with indices or
                    aliases prefixed with "search-". If you select an index that
                    doesn’t start with "search-", an alias to that index will be
                    created and used.
                  `,
                }
              )}
            </p>
          </EuiCallOut>

          <EuiSpacer />

          <EuiFormRow
            label={i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.searchIndexSelectable.label',
              { defaultMessage: 'Select the Elasticsearch index you’d like to use' }
            )}
            helpText={i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.searchIndexSelectable.helpText',
              {
                defaultMessage:
                  "Select an index or alias prefixed with 'search-' or create a new alias below",
              }
            )}
            fullWidth
          >
            <EuiSelectable
              searchable
              options={indicesFormatted}
              singleSelection
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.elasticsearchIndex.indexSelectorAriaLabel',
                {
                  defaultMessage: 'Select the Elasticsearch index you’d like to use',
                }
              )}
              isLoading={isLoadingIndices}
              listProps={{ bordered: true, rowHeight: 56 }}
              onChange={onChange}
              loadingMessage={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.elasticsearchIndex.selectable.loading',
                {
                  defaultMessage: 'Loading Elasticsearch indices',
                }
              )}
              emptyMessage={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.elasticsearchIndex.selectable.empty',
                { defaultMessage: 'No Elasticsearch indices available' }
              )}
              renderOption={renderIndexOption}
              data-test-subj="SearchIndexSelectable"
              className="entSearch__indexSelectable"
            >
              {(list, search) => (
                <>
                  {search}
                  {list}
                </>
              )}
            </EuiSelectable>
          </EuiFormRow>

          <EuiSpacer />

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                data-test-subj="AliasNameFormRow"
                label={i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.aliasName.label',
                  {
                    defaultMessage: 'Alias name',
                  }
                )}
                helpText={
                  aliasName.length > 0 && aliasRawName !== aliasName ? (
                    <>
                      {i18n.translate(
                        'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.aliasName.prefixAndNamed.helpText',
                        {
                          defaultMessage:
                            "Alias names must be prefixed with 'search-' in order to be used with App Search engines. Your alias will be named",
                        }
                      )}
                      &nbsp;<b>{aliasName}</b>
                    </>
                  ) : (
                    i18n.translate(
                      'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.aliasName.prefix.helpText',
                      {
                        defaultMessage:
                          "Alias names must be prefixed with 'search-' in order to be used with App Search engines",
                      }
                    )
                  )
                }
                fullWidth
                isInvalid={showAliasNameErrorMessages}
                error={aliasNameErrorMessage}
              >
                <EuiFieldText
                  name="alias-name"
                  value={aliasRawName}
                  onChange={(event) => setAliasRawName(event.currentTarget.value)}
                  autoComplete="off"
                  fullWidth
                  data-test-subj="AliasNameInput"
                  prepend={aliasOptionalOrRequired}
                  disabled={!isAliasAllowed}
                  isInvalid={showAliasNameErrorMessages}
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
                onClick={() => setCreationStep(EngineCreationSteps.SelectStep)}
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.backButton.label',
                  {
                    defaultMessage: 'Back',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                disabled={isSubmitDisabled}
                isLoading={isLoading}
                type="submit"
                data-test-subj="NewEngineContinueButton"
                fill
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.continue.label',
                  {
                    defaultMessage: 'Continue',
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
