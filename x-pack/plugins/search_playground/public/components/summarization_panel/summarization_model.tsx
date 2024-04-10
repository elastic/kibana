/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiIconTip,
  EuiSuperSelect,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSuperSelectOption } from '@elastic/eui/src/components/form/super_select/super_select_control';
import type { LLMModel } from '../../types';
import { useManagementLink } from '../../hooks/use_management_link';

interface SummarizationModelProps {
  selectedModel: LLMModel;
  onSelect: (model: LLMModel) => void;
  models: LLMModel[];
}

const getOptionValue = (model: LLMModel): string => model.connectorId + model.name;

export const SummarizationModel: React.FC<SummarizationModelProps> = ({
  selectedModel,
  models,
  onSelect,
}) => {
  const managementLink = useManagementLink(selectedModel.connectorId);
  const onChange = (modelValue: string) => {
    const newSelectedModel = models.find((model) => getOptionValue(model) === modelValue);

    if (newSelectedModel) {
      onSelect(newSelectedModel);
    }
  };

  const modelsOption: Array<EuiSuperSelectOption<string>> = useMemo(
    () =>
      models.map((model) => ({
        value: getOptionValue(model),
        disabled: model.disabled,
        inputDisplay: (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type={model.icon} />
            </EuiFlexItem>
            <EuiFlexGroup
              justifyContent="spaceBetween"
              alignItems="center"
              gutterSize="s"
              css={{ overflow: 'hidden' }}
            >
              <EuiText size="s">{model.name}</EuiText>
              {model.showConnectorName && model.connectorName && (
                <EuiText
                  size="xs"
                  color="subdued"
                  css={{ overflow: 'hidden', textOverflow: 'ellipsis', textWrap: 'nowrap' }}
                >
                  <span title={model.connectorName}>{model.connectorName}</span>
                </EuiText>
              )}
            </EuiFlexGroup>
          </EuiFlexGroup>
        ),
        dropdownDisplay: (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type={model.icon} />
            </EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" direction="column">
              <EuiText size="s">{model.name}</EuiText>
              {model.showConnectorName && model.connectorName && (
                <EuiText size="xs" color="subdued">
                  {model.connectorName}
                </EuiText>
              )}
            </EuiFlexGroup>
          </EuiFlexGroup>
        ),
      })),
    [models]
  );

  return (
    <EuiFormRow
      css={{ '.euiFormLabel': { display: 'flex', alignItems: 'center' } }}
      label={
        <>
          <FormattedMessage
            id="xpack.searchPlayground.sidebar.summarizationModel.label"
            defaultMessage="Summarization Model"
          />{' '}
          <EuiIconTip
            content={i18n.translate('xpack.searchPlayground.sidebar.summarizationModel.help', {
              defaultMessage: 'The large language model used to summarize your documents.',
            })}
          />
        </>
      }
      labelAppend={
        <EuiToolTip
          delay="long"
          content={i18n.translate(
            'xpack.searchPlayground.sidebar.summarizationModel.manageConnectorTooltip',
            {
              defaultMessage: 'Manage GenAI connector',
            }
          )}
        >
          <EuiButtonIcon
            target="_blank"
            href={managementLink}
            data-test-subj="manageConnectorsLink"
            iconType="wrench"
            aria-label={i18n.translate(
              'xpack.searchPlayground.sidebar.summarizationModel.manageConnectorLink',
              {
                defaultMessage: 'Manage GenAI connector link',
              }
            )}
          />
        </EuiToolTip>
      }
    >
      <EuiSuperSelect
        data-test-subj="summarizationModelSelect"
        options={modelsOption}
        valueOfSelected={getOptionValue(selectedModel)}
        onChange={onChange}
      />
    </EuiFormRow>
  );
};
