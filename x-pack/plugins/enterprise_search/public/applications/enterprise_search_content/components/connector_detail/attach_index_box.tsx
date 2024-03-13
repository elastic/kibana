/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';

import { useLocation, useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { Connector } from '@kbn/search-connectors';

import { Status } from '../../../../../common/types/api';

import { FetchAllIndicesAPILogic } from '../../api/index/fetch_all_indices_api_logic';

import { AttachIndexLogic } from './attach_index_logic';

const CREATE_NEW_INDEX_GROUP_LABEL = i18n.translate(
  'xpack.enterpriseSearch.attachIndexBox.optionsGroup.createNewIndex',
  {
    defaultMessage: 'Create new index',
  }
);

const SELECT_EXISTING_INDEX_GROUP_LABEL = i18n.translate(
  'xpack.enterpriseSearch.attachIndexBox.optionsGroup.selectExistingIndex',
  {
    defaultMessage: 'Select existing index',
  }
);

export interface AttachIndexBoxProps {
  connector: Connector;
}

export const AttachIndexBox: React.FC<AttachIndexBoxProps> = ({ connector }) => {
  const { indexName } = useParams<{ indexName: string }>();
  const { createIndex, attachIndex, setConnector, checkIndexExists } = useActions(AttachIndexLogic);
  const {
    isLoading: isSaveLoading,
    isExistLoading,
    indexExists,
    createApiError,
    attachApiError,
  } = useValues(AttachIndexLogic);
  const [selectedIndex, setSelectedIndex] = useState<
    { label: string; shouldCreate?: boolean } | undefined
  >(
    connector.index_name
      ? {
          label: connector.index_name,
        }
      : undefined
  );
  const [selectedLanguage] = useState<string>();
  const [query, setQuery] = useState<{
    hasMatchingOptions: boolean;
    isFullMatch: boolean;
    searchValue: string;
  }>();

  const { makeRequest } = useActions(FetchAllIndicesAPILogic);
  const { data, status } = useValues(FetchAllIndicesAPILogic);
  const isLoading = [Status.IDLE, Status.LOADING].includes(status);

  const onSave = () => {
    if (selectedIndex?.shouldCreate) {
      createIndex({ indexName: selectedIndex.label, language: selectedLanguage ?? null });
    } else if (selectedIndex && !(selectedIndex.label === connector.index_name)) {
      attachIndex({ connectorId: connector.id, indexName: selectedIndex.label });
    }
  };

  const options: Array<EuiComboBoxOptionOption<string>> = isLoading
    ? []
    : data?.indices.map((index) => {
        return {
          label: index.name,
        };
      }) ?? [];

  const shouldPrependUserInputAsOption =
    !!query?.searchValue && query.hasMatchingOptions && !query.isFullMatch;

  const groupedOptions: Array<EuiComboBoxOptionOption<string>> = shouldPrependUserInputAsOption
    ? [
        ...[
          {
            label: CREATE_NEW_INDEX_GROUP_LABEL,
            options: [
              {
                label: query.searchValue,
              },
            ],
          },
        ],
        ...[{ label: SELECT_EXISTING_INDEX_GROUP_LABEL, options }],
      ]
    : [{ label: SELECT_EXISTING_INDEX_GROUP_LABEL, options }];

  useEffect(() => {
    setConnector(connector);
    makeRequest({});
    if (!connector.index_name && connector.name) {
      checkIndexExists({ indexName: connector.name });
    }
  }, [connector.id]);

  useEffect(() => {
    if (query) {
      checkIndexExists({ indexName: query.searchValue });
    }
  }, [query]);

  const { hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      if (id === 'attachIndexBox') {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [hash]);

  const error =
    !!query && indexExists[query.searchValue]
      ? i18n.translate(
          'xpack.enterpriseSearch.attachIndexBox.euiFormRow.associatedIndexErrorTextLabel',
          {
            defaultMessage:
              "You can't create a new index using an existing index name. Choose an existing index or create a new index with a new name.",
          }
        )
      : attachApiError?.body?.message || createApiError?.body?.message || undefined;
  if (indexName) {
    // We don't want to let people edit indices when on the index route
    return <></>;
  }

  return (
    <EuiPanel hasShadow={false} hasBorder id="attachIndexBox">
      <EuiTitle size="s">
        <h4>
          {i18n.translate('xpack.enterpriseSearch.attachIndexBox.h4.attachAnIndexLabel', {
            defaultMessage: 'Attach an index',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer />
      <EuiText size="s">
        <FormattedMessage
          id="xpack.enterpriseSearch.attachIndexBox.thisIndexWillHoldTextLabel"
          defaultMessage="This index will hold your data source content, and is optimized with default field mappings
        for relevant search experiences. Give your index a unique name and optionally set a default
        language analyzer for the index."
        />
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate(
              'xpack.enterpriseSearch.attachIndexBox.euiFormRow.associatedIndexLabel',
              { defaultMessage: 'Associated index' }
            )}
            helpText={i18n.translate(
              'xpack.enterpriseSearch.attachIndexBox.euiFormRow.associatedIndexHelpTextLabel',
              { defaultMessage: 'You can use an existing index or create a new one.' }
            )}
            error={error}
            isInvalid={!!error}
          >
            <EuiComboBox
              placeholder={i18n.translate(
                'xpack.enterpriseSearch.attachIndexBox.euiFormRow.indexSelector.placeholder',
                { defaultMessage: 'Select or create an index' }
              )}
              customOptionText={i18n.translate(
                'xpack.enterpriseSearch.attachIndexBox.euiFormRow.indexSelector.customOption',
                {
                  defaultMessage: 'Create index {searchValue}',
                  values: { searchValue: '{searchValue}' },
                }
              )}
              isLoading={isLoading}
              options={groupedOptions}
              onSearchChange={(searchValue, hasMatchingOptions) => {
                setQuery({
                  hasMatchingOptions: !!hasMatchingOptions,
                  isFullMatch: options.some((option) => option.label === searchValue),
                  searchValue,
                });
              }}
              onChange={(selection) => {
                const currentSelection = selection[0] ?? undefined;
                const selectedIndexOption = currentSelection
                  ? {
                      label: currentSelection.label,
                      shouldCreate:
                        shouldPrependUserInputAsOption &&
                        !!(currentSelection?.label === query?.searchValue),
                    }
                  : undefined;
                setSelectedIndex(selectedIndexOption);
              }}
              selectedOptions={selectedIndex ? [selectedIndex] : undefined}
              onCreateOption={(value) => {
                setSelectedIndex({ label: value.trim(), shouldCreate: true });
              }}
              singleSelection
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFlexGroup>
        {!connector.index_name && (
          <EuiFlexItem grow={false}>
            <EuiButton
              color="primary"
              fill
              onClick={() => {
                createIndex({ indexName: connector.name, language: null });
              }}
              isLoading={isSaveLoading || isExistLoading}
              disabled={indexExists[connector.name]}
            >
              {i18n.translate('xpack.enterpriseSearch.attachIndexBox.createSameIndexButtonLabel', {
                defaultMessage: 'Create and attach an index named {indexName}',
                values: { indexName: connector.name },
              })}
            </EuiButton>
            {indexExists[connector.name] ? (
              <EuiText size="xs">
                {i18n.translate('xpack.enterpriseSearch.attachIndexBox.indexNameExistsError', {
                  defaultMessage: 'Index with name {indexName} already exists',
                  values: { indexName: connector.name },
                })}
              </EuiText>
            ) : (
              <></>
            )}
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={() => onSave()}
            disabled={!selectedIndex || selectedIndex.label === connector.index_name}
            isLoading={isSaveLoading}
          >
            {i18n.translate('xpack.enterpriseSearch.attachIndexBox.saveConfigurationButtonLabel', {
              defaultMessage: 'Save configuration',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
