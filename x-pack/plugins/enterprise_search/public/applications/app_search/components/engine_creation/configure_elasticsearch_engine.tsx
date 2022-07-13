/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { HealthStatus } from '@elastic/elasticsearch/lib/api/types';

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHealth,
  EuiHighlight,
  EuiI18n,
  EuiIcon,
  EuiPanel,
  EuiSelectable,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
  EuiTextAlign,
  EuiTitle,
  EuiToolTip,
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

import './engine_creation.scss';

export interface SearchIndexSelectableOption {
  label: string;
  health?: HealthStatus;
  status?: string;
  alias: boolean;
  badge: {
    color: string;
    icon: string;
    label: string;
    toolTipTitle: string;
    toolTipContent: string;
  };
  disabled: boolean;
  total: {
    docs: {
      count: number;
      deleted: number;
    };
    store: {
      size_in_bytes: string;
    };
  };
  checked?: 'on';
}

const healthColorsMap = {
  red: 'danger',
  RED: 'danger',
  green: 'success',
  GREEN: 'success',
  yellow: 'warning',
  YELLOW: 'warning',
};

interface IndexStatusDetailsProps {
  option: SearchIndexSelectableOption;
}

export const IndexStatusDetails: React.FC<IndexStatusDetailsProps> = ({ option }) => (
  <EuiFlexGroup className="entSearch__indexListItem" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiHealth color={option.health ? healthColorsMap[option.health] : ''}>
        {option.health ?? '-'}
      </EuiHealth>
    </EuiFlexItem>
    <EuiFlexItem grow={false} data-test-subj="optionStatus">
      <EuiI18n
        token="xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.status"
        default="{status}"
        values={{
          status: (
            <span>
              <b>Status</b>: {option.status ?? '-'}
            </span>
          ),
        }}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false} data-test-subj="optionDocs">
      <EuiI18n
        token="xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.docCount"
        default="{docsCount}"
        values={{
          docsCount: (
            <span>
              <b>Docs count</b>: {option.total?.docs?.count ?? '-'}
            </span>
          ),
        }}
      />
    </EuiFlexItem>
    <EuiFlexItem data-test-subj="optionStorage">
      <EuiI18n
        token="xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.storage"
        default="{storageSize}"
        values={{
          storageSize: (
            <span>
              <b>Storage size</b>: {option.total?.store?.size_in_bytes ?? '-'}
            </span>
          ),
        }}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false} data-test-subj="optionStorage">
      <EuiBadge color={option.badge.color} iconType={option.badge.icon}>
        <EuiToolTip
          position="left"
          title={option.badge.toolTipTitle}
          content={option.badge.toolTipContent}
        >
          <p>{option.badge.label}</p>
        </EuiToolTip>
      </EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);

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
    indicesFormatted,
    isAliasAllowed,
    isAliasRequired,
    isLoading,
    isLoadingIndices,
    isSubmitDisabled,
    name,
    rawName,
  } = useValues(EngineCreationLogic);
  const {
    loadIndices,
    setIsAliasAllowed,
    setAliasName,
    setCreationStep,
    setRawName,
    setSelectedIndex,
  } = useActions(EngineCreationLogic);

  const onChange = (options: SearchIndexSelectableOption[]) => {
    const selected = options.find((option) => option.checked === 'on');
    setSelectedIndex(selected?.label ?? '');
    if (selected?.alias ?? false) setAliasName('');
    setIsAliasAllowed(!selected?.alias ?? true);
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
            title: 'Review',
            onClick: () => {
              setCreationStep(EngineCreationSteps.ReviewStep);
            },
          },
        ]}
      />
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
              'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.description',
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
              'xpack.enterpriseSearch.appSearch.engineCreation.configureElasticsearchEngine.callout.title',
              { defaultMessage: 'About index and alias names' }
            )}
            iconType="iInCircle"
          >
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.configureElasticsearchEngine.callout.body',
                {
                  defaultMessage: `
                    Enterprise Search requires an index or alias name to be
                    prefixed with "search-." If you select an index whose name
                    does not match that pattern, an alias will be generated for
                    you and your search engine will be attached to the alias
                    instead. If you wish to connect an alias whose name does not
                    match the required pattern, you'll need to create a new
                    alias on your own.
                  `,
                }
              )}
            </p>
          </EuiCallOut>

          <EuiSpacer />

          <EuiFormRow
            label={i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.searchIndexSelectable.label',
              { defaultMessage: 'Select the Elasticsearch index you’d like to use' }
            )}
            helpText={i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.searchIndexSelectable.helpText',
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
                'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.indexSelectorAriaLabel',
                {
                  defaultMessage: 'Select the Elasticsearch index you’d like to use',
                }
              )}
              isLoading={isLoadingIndices}
              listProps={{ bordered: true, rowHeight: 56 }}
              onChange={onChange}
              loadingMessage={i18n.translate(
                'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.selectable.loading',
                {
                  defaultMessage: 'Loading Elasticsearch indices',
                }
              )}
              emptyMessage={i18n.translate(
                'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.selectable.empty',
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
                  'xpack.enterpriseSearch.appSearch.engineCreation.form.aliasName.label',
                  {
                    defaultMessage: 'Alias name',
                  }
                )}
                helpText={i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engineCreation.form.aliasName.helpText',
                  {
                    defaultMessage:
                      "Alias names must be prefixed with 'search-' in order to be used with App Search engines",
                  }
                )}
                fullWidth
              >
                <EuiFieldText
                  name="alias-name"
                  value={aliasName}
                  onChange={(event) => setAliasName(event.currentTarget.value)}
                  autoComplete="off"
                  fullWidth
                  data-test-subj="AliasNameInput"
                  prepend={aliasOptionalOrRequired}
                  disabled={!isAliasAllowed}
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
                isLoading={isLoading}
                type="submit"
                data-test-subj="NewEngineSubmitButton"
                fill
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engineCreation.form.continue.label',
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
