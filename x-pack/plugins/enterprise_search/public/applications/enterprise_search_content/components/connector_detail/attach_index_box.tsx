/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
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

export interface AttachIndexBoxProps {
  connector: Connector;
}

export const AttachIndexBox: React.FC<AttachIndexBoxProps> = ({ connector }) => {
  const { createIndex, attachIndex, setConnector } = useActions(AttachIndexLogic);
  const { isLoading: isSaveLoading } = useValues(AttachIndexLogic);
  const [selectedIndex, setSelectedIndex] = useState<{ label: string; shouldCreate?: boolean }>();
  const [selectedLanguage] = useState<string>();

  const { makeRequest } = useActions(FetchAllIndicesAPILogic);
  const { data, status } = useValues(FetchAllIndicesAPILogic);
  const isLoading = [Status.IDLE, Status.LOADING].includes(status);

  const onSave = () => {
    if (selectedIndex?.shouldCreate) {
      createIndex({ indexName: selectedIndex.label, language: selectedLanguage ?? null });
    } else if (selectedIndex) {
      attachIndex({ connectorId: connector.id, indexName: selectedIndex.label });
    }
  };

  const options: Array<EuiComboBoxOptionOption<{ label: string }>> = isLoading
    ? []
    : data?.indices.map((index) => {
        return {
          label: index.name,
        };
      }) ?? [];
  useEffect(() => {
    setConnector(connector);
    makeRequest({});
  }, [connector.id]);

  return (
    <EuiPanel hasShadow={false} hasBorder>
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
      <EuiLink>
        {i18n.translate('xpack.enterpriseSearch.attachIndexBox.learnMoreAboutIndicesLinkLabel', {
          defaultMessage: 'Learn more about indices',
        })}
      </EuiLink>
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
              { defaultMessage: 'You can use an existing index or create a new one' }
            )}
          >
            <EuiComboBox
              placeholder={i18n.translate(
                'xpack.enterpriseSearch.attachIndexBox.euiFormRow.indexSelector.placeholder',
                { defaultMessage: 'Select or create an index' }
              )}
              customOptionText={i18n.translate(
                'xpack.enterpriseSearch.attachIndexBox.euiFormRow.indexSelector.customOption',
                {
                  defaultMessage: 'Create {searchValue} new index',
                  values: { searchValue: '{searchValue}' },
                }
              )}
              isLoading={isLoading}
              options={options}
              onChange={(selection) => setSelectedIndex(selection[0] || undefined)}
              selectedOptions={selectedIndex ? [selectedIndex] : undefined}
              onCreateOption={(value) => {
                setSelectedIndex({ label: value.trim(), shouldCreate: true });
              }}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={() => onSave()} disabled={!selectedIndex} isLoading={isSaveLoading}>
            {i18n.translate('xpack.enterpriseSearch.attachIndexBox.saveConfigurationButtonLabel', {
              defaultMessage: 'Save Configuration',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
