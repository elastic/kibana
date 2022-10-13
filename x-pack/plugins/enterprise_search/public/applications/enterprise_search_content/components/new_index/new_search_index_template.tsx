/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SUPPORTED_LANGUAGES } from './constants';
import { NewSearchIndexLogic } from './new_search_index_logic';
import { LanguageForOptimization } from './types';

export interface Props {
  buttonLoading?: boolean;
  disabled?: boolean;
  docsUrl?: string;
  error?: string | React.ReactNode;
  onNameChange?(name: string): void;
  onSubmit(name: string, language: LanguageForOptimization): void;
  title: React.ReactNode;
  type: string;
}

export const NewSearchIndexTemplate: React.FC<Props> = ({
  buttonLoading,
  children,
  disabled,
  docsUrl,
  error,
  onNameChange,
  onSubmit,
  title,
  type,
}) => {
  const {
    fullIndexName,
    fullIndexNameExists,
    fullIndexNameIsValid,
    language,
    rawName,
    languageSelectValue,
  } = useValues(NewSearchIndexLogic);
  const { setRawName, setLanguageSelectValue } = useActions(NewSearchIndexLogic);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRawName(e.target.value);
    if (onNameChange) {
      onNameChange(fullIndexName);
    }
  };

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setLanguageSelectValue(e.target.value);
  };

  const formInvalid = !!error || fullIndexNameExists || !fullIndexNameIsValid;

  const formError = () => {
    if (fullIndexNameExists) {
      return i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.alreadyExists.error',
        {
          defaultMessage: 'An index with the name {indexName} already exists',
          values: {
            indexName: fullIndexName,
          },
        }
      );
    }
    if (!fullIndexNameIsValid) {
      return i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.isInvalid.error',
        {
          defaultMessage: '{indexName} is an invalid index name',
          values: {
            indexName: fullIndexName,
          },
        }
      );
    }
    return error;
  };

  return (
    <EuiPanel hasBorder>
      <EuiForm
        component="form"
        id="enterprise-search-add-connector"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(fullIndexName, language);
        }}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h2>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiFlexGroup>
              <EuiFlexItem grow>
                <EuiFormRow
                  isDisabled={disabled}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.nameInputLabel',
                    {
                      defaultMessage: 'Index name',
                    }
                  )}
                  isInvalid={formInvalid}
                  error={formError()}
                  helpText={i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.nameInputHelpText.lineOne',
                    {
                      defaultMessage: 'Your index will be named: {indexName}',
                      values: {
                        indexName: fullIndexName,
                      },
                    }
                  )}
                  fullWidth
                >
                  <EuiFieldText
                    data-telemetry-id={`entSearchContent-${type}-newIndex-editName`}
                    placeholder={i18n.translate(
                      'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.nameInputPlaceholder',
                      {
                        defaultMessage: 'Set a name for your index',
                      }
                    )}
                    fullWidth
                    disabled={disabled}
                    isInvalid={false}
                    value={rawName}
                    onChange={handleNameChange}
                    autoFocus
                    prepend="search-"
                  />
                </EuiFormRow>
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.nameInputHelpText.lineTwo',
                    {
                      defaultMessage:
                        'Names should be lowercase and cannot contain spaces or special characters.',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  isDisabled={disabled}
                  label={i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.languageInputLabel',
                    {
                      defaultMessage: 'Language analyzer',
                    }
                  )}
                  helpText={i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.languageInputHelpText',
                    {
                      defaultMessage: 'Language can be changed later, but may require a reindex',
                    }
                  )}
                >
                  <EuiSelect
                    data-telemetry-id={`entSearchContent-${type}-newIndex-languageAnalyzer`}
                    disabled={disabled}
                    options={SUPPORTED_LANGUAGES}
                    onChange={handleLanguageChange}
                    value={languageSelectValue}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFlexGroup direction="row" alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButton
              data-telemetry-id={`entSearchContent-${type}-newIndex-createIndex`}
              fill
              isDisabled={!rawName || buttonLoading || formInvalid || disabled}
              isLoading={buttonLoading}
              type="submit"
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.createIndex.buttonText',
                {
                  defaultMessage: 'Create index',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
          {!!docsUrl && (
            <EuiFlexItem grow={false}>
              <EuiLink target="_blank" href={docsUrl}>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.viewDocumentation.linkText',
                  {
                    defaultMessage: 'View the documentation',
                  }
                )}
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiForm>
      <EuiHorizontalRule />
      {children}
    </EuiPanel>
  );
};
