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
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Engine } from '../../../app_search/components/engine/types';

import { SUPPORTED_LANGUAGES } from './constants';
import { NewSearchIndexLogic } from './new_search_index_logic';

export interface ISearchIndex {
  title: React.ReactNode;
  description: React.ReactNode;
  docsUrl: string;
  type: string;
  onNameChange?(name: string): void;
}

export interface ISearchEngineOption {
  label: string;
  value: Engine;
}

export const NewSearchIndexTemplate: React.FC<ISearchIndex> = ({
  children,
  title,
  description,
  onNameChange,
}) => {
  const { name, language, rawName } = useValues(NewSearchIndexLogic);
  const { setRawName, setLanguage } = useActions(NewSearchIndexLogic);

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
            <h2>{title}</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>
              {description}
              <EuiLink target="_blank" href="#">
                {i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.learnMore.linkText',
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
                    defaultMessage: 'Index name',
                  }
                )}
                helpText={i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.nameInputHelpText',
                  {
                    defaultMessage:
                      'Names cannot contain spaces or special characters. {indexName}',
                    values: {
                      indexName: name.length > 0 ? `Your index will be named: ${name}` : '',
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
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.languageInputLabel',
                  {
                    defaultMessage: 'Document language',
                  }
                )}
                helpText={i18n.translate(
                  'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.languageInputHelpText',
                  {
                    defaultMessage: 'Analyzers can be changed later, but may require a reindex',
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
        <EuiFlexItem grow>{children}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFlexGroup direction="row" alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButton fill isDisabled={!name}>
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
      <EuiSpacer />

      <EuiSteps
        steps={[
          {
            title: i18n.translate(
              'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.steps.createIndex.title',
              {
                defaultMessage: 'Create an Elasticsearch index',
              }
            ),

            titleSize: 'xs',
            children: (
              <EuiText size="s">
                <p>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.steps.createIndex.content',
                    {
                      defaultMessage:
                        'Provide a unique name for your index and select an optional language analyzer.',
                    }
                  )}
                </p>
              </EuiText>
            ),
            status: 'incomplete',
          },
          {
            title: i18n.translate(
              'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.steps.configureIngestion.title',
              {
                defaultMessage: 'Configure ingestion settings',
              }
            ),
            titleSize: 'xs',
            children: (
              <EuiText size="s">
                <p>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.steps.configureIngestion.content',
                    {
                      defaultMessage:
                        'Generate an API key and view the documentation for posting documents to the Elasticsearch API endpoint. Language clients are available for streamlined integration.',
                    }
                  )}
                </p>
              </EuiText>
            ),
            status: 'incomplete',
          },
          {
            title: i18n.translate(
              'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.steps.buildSearchExperience.title',
              {
                defaultMessage: 'Build a search experience',
              }
            ),
            titleSize: 'xs',
            children: (
              <EuiText size="s">
                <p>
                  {i18n.translate(
                    'xpack.enterpriseSearch.content.newIndex.newSearchIndexTemplate.steps.buildSearchExperience.content',
                    {
                      defaultMessage:
                        'Connect your newly created Elasticsearch index to an App Search engine to build a cusomtizable search experience.',
                    }
                  )}
                </p>
              </EuiText>
            ),
            status: 'incomplete',
          },
        ]}
      />
    </EuiPanel>
  );
};
