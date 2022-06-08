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

import { Engine } from '../../../app_search/components/engine/types';

import { SUPPORTED_LANGUAGES, NEW_INDEX_TEMPLATE_TYPES } from './constants';
import { NewIndexLogic } from './new_index_logic';

export interface IIndex {
  description: React.ReactNode;
  docsUrl: string;
  type: string;
  onNameChange?(name: string): void;
}

export interface ISearchEngineOption {
  label: string;
  value: Engine;
}

export const NewIndexTemplate: React.FC<IIndex> = ({
  children,
  description,
  type,
  onNameChange,
}) => {
  const { searchEngineSelectOptions, name, language, rawName, selectedSearchEngines } =
    useValues(NewIndexLogic);
  const { setRawName, setLanguage, setSelectedSearchEngineOptions } =
    useActions(NewIndexLogic);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRawName(e.target.value);
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
                'xpack.enterpriseSearch.content.newIndex.newIndexTemplate.title',
                {
                  defaultMessage: 'New {type}',
                  values: { type: NEW_INDEX_TEMPLATE_TYPES[type] },
                }
              )}
            </h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>
              {description}
              <EuiLink target="_blank" href="#">
                {i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.newIndexTemplate.learnMore.linkText',
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
                  'xpack.enterpriseSearch.content.newIndex.newIndexTemplate.nameInputLabel',
                  {
                    defaultMessage: 'Name your {type}',
                    values: { type: NEW_INDEX_TEMPLATE_TYPES[type] },
                  }
                )}
                fullWidth
              >
                <EuiFieldText
                  placeholder={i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.newIndexTemplate.nameInputPlaceholder',
                    {
                      defaultMessage: 'Set a name for the {type}',
                      values: { type: NEW_INDEX_TEMPLATE_TYPES[type] },
                    }
                  )}
                  fullWidth
                  isInvalid={false}
                  value={rawName}
                  onChange={handleNameChange}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.newIndexTemplate.languageInputLabel',
                  {
                    defaultMessage: 'Language',
                  }
                )}
              >
                <EuiSelect
                  options={SUPPORTED_LANGUAGES}
                  onChange={handleLanguageChange}
                  value={language}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {searchEngineSelectOptions.length !== 0 && (
          <EuiFlexItem grow>
            <EuiFormRow
              label={i18n.translate(
                'xpack.enterpriseSearch.content.newIndex.newIndexTemplate.attachSearchEngines.label',
                {
                  defaultMessage: 'Attach search engines',
                }
              )}
              fullWidth
              helpText={i18n.translate(
                'xpack.enterpriseSearch.content.newIndex.newIndexTemplate.attachSearchEngines.helpText',
                {
                  defaultMessage:
                    'Select one or more existing search engines. You can also create one later',
                }
              )}
            >
              <EuiComboBox
                fullWidth
                options={searchEngineSelectOptions}
                onChange={(options) => {
                  setSelectedSearchEngineOptions(options);
                }}
                selectedOptions={selectedSearchEngines}
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
            'xpack.enterpriseSearch.content.newIndex.newIndexTemplate.createIndex.buttonText',
            {
              defaultMessage: 'Create index',
            }
          )}
        </EuiButton>
      </span>
    </EuiPanel>
  );
};
