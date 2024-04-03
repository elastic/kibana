/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiSuperSelect,
  EuiSuperSelectOption,
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { SummarizationModelName } from '../../types';

import { OpenAIIcon } from './open_ai_icon';

const renderSelectOptions = (label: string) => (
  <EuiFlexGroup alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiIcon type={OpenAIIcon} />
    </EuiFlexItem>
    <EuiFlexItem>{label}</EuiFlexItem>
  </EuiFlexGroup>
);

const SummarizationModel: Array<EuiSuperSelectOption<string>> = [
  {
    value: SummarizationModelName.gpt3_5,
    inputDisplay: renderSelectOptions(SummarizationModelName.gpt3_5),
  },
  {
    value: SummarizationModelName.gpt3_5_turbo_1106,
    inputDisplay: renderSelectOptions(SummarizationModelName.gpt3_5_turbo_1106),
  },
  {
    value: SummarizationModelName.gpt3_5_turbo_16k,
    inputDisplay: renderSelectOptions(SummarizationModelName.gpt3_5_turbo_16k),
  },
  {
    value: SummarizationModelName.gpt3_5_turbo_16k_0613,
    inputDisplay: renderSelectOptions(SummarizationModelName.gpt3_5_turbo_16k_0613),
  },
  {
    value: SummarizationModelName.gpt3_5_turbo,
    inputDisplay: renderSelectOptions(SummarizationModelName.gpt3_5_turbo),
  },
];

interface OpenAISummarizationModelProps {
  openAIFlyOutOpen: () => void;
  model: string;
  onSelect: (key: string) => void;
}

export const OpenAISummarizationModel: React.FC<OpenAISummarizationModelProps> = ({
  model = SummarizationModelName.gpt3_5_turbo_1106,
  onSelect,
  openAIFlyOutOpen,
}) => {
  const onChange = (value: string) => {
    onSelect(value);
  };

  return (
    <EuiFormRow
      label={
        <EuiToolTip
          content={i18n.translate('xpack.searchPlayground.sidebar.summarizationModel.help', {
            defaultMessage: 'The large language model used to summarize your documents.',
          })}
        >
          <>
            <span>
              {i18n.translate('xpack.searchPlayground.sidebar.summarizationModel.label', {
                defaultMessage: 'Summarization Model',
              })}
            </span>
            <EuiIcon type="questionInCircle" color="subdued" />
          </>
        </EuiToolTip>
      }
      labelAppend={
        <EuiButtonEmpty flush="both" size="xs" onClick={() => openAIFlyOutOpen()}>
          {i18n.translate('xpack.searchPlayground.sidebar.summarizationModel.editLabel', {
            defaultMessage: 'Edit OpenAI API key',
          })}
        </EuiButtonEmpty>
      }
    >
      <EuiSuperSelect options={SummarizationModel} valueOfSelected={model} onChange={onChange} />
    </EuiFormRow>
  );
};
