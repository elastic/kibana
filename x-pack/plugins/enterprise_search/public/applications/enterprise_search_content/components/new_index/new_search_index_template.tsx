/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * - Need to add documentation URLs (search for `#`s)
 * - Bind create index button
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
  error?: string | React.ReactNode;
  onNameChange?(name: string): void;
  onSubmit(name: string, language: LanguageForOptimization): void;
  title: React.ReactNode;
  type: string;
}

export const NewSearchIndexTemplate: React.FC<Props> = ({
  children,
  error,
  title,
  onNameChange,
  onSubmit,
  buttonLoading,
}) => {
  const {
    fullIndexName,
    fullIndexNameExists,
    fullIndexNameIsValid,
    isLoading,
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
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(fullIndexName, language);
        }}
        component="form"
        id="enterprise-search-add-connector"
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
                    placeholder={i18n.translate(
                      'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.nameInputPlaceholder',
                      {
                        defaultMessage: 'Set a name for your index',
                      }
                    )}
                    fullWidth
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
              fill
              isDisabled={!rawName || buttonLoading || isLoading || formInvalid}
              isLoading={buttonLoading || isLoading}
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
          <EuiFlexItem grow={false}>
            <EuiLink target="_blank" href="#">
              {i18n.translate(
                'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.viewDocumentation.linkText',
                {
                  defaultMessage: 'View the documentation',
                }
              )}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
      <EuiHorizontalRule />
      {children}
    </EuiPanel>
  );
};
