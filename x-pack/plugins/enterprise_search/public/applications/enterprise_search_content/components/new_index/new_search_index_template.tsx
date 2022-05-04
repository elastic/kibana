/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * - Need to add documentation URLs (search for `#`s)
 * - Replace `onNameChange` logic with that from App Search
 * - Need to implement the logic for the attaching search engines functionality
 */

import React, { useState, ChangeEvent, useEffect } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiButton,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SearchIndicesLogic } from '../search_indices';

import { SUPPORTED_LANGUAGES } from './constants';

export interface ISearchIndex {
  description: React.ReactNode;
  docsUrl: string;
  type: string;
  onNameChange?(name: string): void;
}

export interface ISearchEngineOption {
  label: string;
}

export const NewSearchIndexTemplate: React.FC<ISearchIndex> = ({
  children,
  description,
  type,
  onNameChange,
}) => {
  const { searchEngines } = useValues(SearchIndicesLogic);
  const { loadSearchEngines } = useActions(SearchIndicesLogic);
  useEffect(() => {
    loadSearchEngines();
  });

  const [selectedSearchEngines, setSelectedSearchEngines] = useState([] as string[]);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('Universal');

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (onNameChange) {
      onNameChange(e.target.value);
    }
  };

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
  };

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>
              {i18n.translate(
                'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.title',
                {
                  defaultMessage: 'New {type}',
                  values: { type },
                }
              )}
            </h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>
              {description}{' '}
              <EuiLink target="_blank" href="#">
                {i18n.translate(
                  'xpack.enterprppiseSearch.content.newIndex.newSearchIndexTemplate.learnMore.linkText',
                  {
                    defaultMessage: 'Learn more',
                  }
                )}
              </EuiLink>
            </p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiFlexGroup>
            <EuiFlexItem grow>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.nameInputLabel',
                  {
                    defaultMessage: 'Name your {type}',
                    values: { type: type.toLowerCase() },
                  }
                )}
                fullWidth
              >
                <EuiFieldText
                  placeholder={i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.nameInputPlaceholder',
                    {
                      defaultMessage: 'Set a name for the {type}',
                      values: { type: type.toLowerCase() },
                    }
                  )}
                  fullWidth
                  isInvalid={false}
                  value={name}
                  onChange={(event) => handleNameChange(event)}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.languageInputLabel',
                  {
                    defaultMessage: 'Language',
                    values: { type: type.toLowerCase() },
                  }
                )}
              >
                <EuiSelect
                  options={SUPPORTED_LANGUAGES}
                  onChange={(event) => handleLanguageChange(event)}
                  value={language}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {searchEngines.length !== 0 && (
          <EuiFlexItem grow>
            <EuiFormRow
              label={i18n.translate(
                'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.attachSearchEngines.label',
                {
                  defaultMessage: 'Attach search engines',
                }
              )}
              fullWidth
              helpText={i18n.translate(
                'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.attachSearchEngines.helpText',
                {
                  defaultMessage:
                    'Select one or more existing search engines. You can also create one later',
                }
              )}
            >
              <EuiComboBox
                fullWidth
                options={searchEngines.map((s) => ({ label: s.name }))}
                onChange={(options) => {
                  setSelectedSearchEngines(options.map(({ value }) => value as string));
                }}
                selectedOptions={selectedSearchEngines.map((engineName) => ({ label: engineName }))}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow>{children}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <span>
        <EuiButton fill isDisabled={!name}>
          {i18n.translate(
            'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.createIndex.buttonText',
            {
              defaultMessage: 'Create search index',
            }
          )}
        </EuiButton>
      </span>
    </EuiPanel>
  );
};
