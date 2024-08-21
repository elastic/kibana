/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiComboBox,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';

import { FormattedMessage } from '@kbn/i18n-react';

import type { DataStream } from '../../../../../../../../../common/types';
import { GENERIC_DATASET_NAME } from '../../../../../../../../../common/constants';
import { isValidDataset } from '../../../../../../../../../common';

const FormRow = styled(EuiFormRow)`
  .euiFormRow__label {
    flex: 1;
  }

  .euiFormRow__fieldWrapper > .euiPanel {
    padding: ${(props) => props.theme.eui?.euiSizeXS};
  }
`;

interface SelectedDataset {
  dataset: string;
  package: string;
}

export const DatasetComponent: React.FC<{
  value?: SelectedDataset | string;
  onChange: (newValue: SelectedDataset) => void;
  datastreams: DataStream[];
  pkgName?: string;
  isDisabled?: boolean;
  fieldLabel: string;
  description?: string;
}> = ({ value, onChange, datastreams, isDisabled, pkgName = '', fieldLabel, description }) => {
  const datasetOptions =
    datastreams.map((datastream: DataStream) => ({
      label: datastream.dataset,
      value: datastream,
    })) ?? [];
  const existingGenericStream = datasetOptions.find((ds) => ds.label === GENERIC_DATASET_NAME);
  const valueAsOption = value
    ? typeof value === 'string'
      ? { label: value, value: { dataset: value, package: pkgName } }
      : { label: value.dataset, value: { dataset: value.dataset, package: value.package } }
    : undefined;
  const defaultOption = valueAsOption ||
    existingGenericStream || {
      label: GENERIC_DATASET_NAME,
      value: { dataset: GENERIC_DATASET_NAME, package: pkgName },
    };

  const [selectedOptions, setSelectedOptions] = useState<Array<{ label: string }>>([defaultOption]);
  const [isInvalid, setIsInvalid] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!value || typeof value === 'string') onChange(defaultOption.value as SelectedDataset);
  }, [value, defaultOption.value, onChange, pkgName]);

  const onDatasetChange = (newSelectedOptions: Array<{ label: string; value?: DataStream }>) => {
    setSelectedOptions(newSelectedOptions);
    const dataStream = newSelectedOptions[0].value;
    const { valid, error: dsError } = isValidDataset(newSelectedOptions[0].label, false);
    setIsInvalid(!valid);
    setError(dsError);
    onChange({
      dataset: newSelectedOptions[0].label,
      package: !dataStream || typeof dataStream === 'string' ? pkgName : dataStream.package,
    });
  };

  const onCreateOption = (searchValue: string = '') => {
    const normalizedSearchValue = searchValue.trim().toLowerCase();
    if (!normalizedSearchValue) {
      return;
    }
    const newOption = {
      label: searchValue,
      value: { dataset: searchValue, package: pkgName },
    };
    setSelectedOptions([newOption]);
    const { valid, error: dsError } = isValidDataset(searchValue, false);
    setIsInvalid(!valid);
    setError(dsError);
    onChange({
      dataset: searchValue,
      package: pkgName,
    });
  };
  return (
    <FormRow
      isInvalid={isInvalid}
      error={error}
      hasChildLabel={true}
      label={fieldLabel}
      helpText={description && <ReactMarkdown children={description} />}
      fullWidth
    >
      <>
        <EuiComboBox
          aria-label={i18n.translate('xpack.fleet.datasetCombo.ariaLabel', {
            defaultMessage: 'Dataset combo box',
          })}
          placeholder={i18n.translate('xpack.fleet.datasetCombo.placeholder', {
            defaultMessage: 'Select a dataset',
          })}
          singleSelection={{ asPlainText: true }}
          options={datasetOptions}
          selectedOptions={selectedOptions}
          onCreateOption={onCreateOption}
          onChange={onDatasetChange}
          customOptionText={i18n.translate('xpack.fleet.datasetCombo.customOptionText', {
            defaultMessage: 'Add {searchValue} as a custom option',
            values: { searchValue: '{searchValue}' },
          })}
          isClearable={false}
          isDisabled={isDisabled}
          data-test-subj="datasetComboBox"
          isInvalid={isInvalid}
        />
        {valueAsOption && valueAsOption.value.package !== pkgName && (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="warning">
              <EuiIcon type="warning" />
              &nbsp;
              <FormattedMessage
                id="xpack.fleet.datasetCombo.warning"
                defaultMessage="This data stream is managed by the {package} integration, {learnMore}."
                values={{
                  package: valueAsOption.value.package,
                  learnMore: (
                    <EuiToolTip
                      position="bottom"
                      content={
                        <FormattedMessage
                          id="xpack.fleet.datasetCombo.warningTooltip"
                          defaultMessage="The destination data stream may not be designed to receive data from this integration, check that the mappings and ingest pipelines are compatible before sending data."
                        />
                      }
                    >
                      <EuiLink target="_blank">
                        {i18n.translate('xpack.fleet.datasetCombo.learnMoreLink', {
                          defaultMessage: 'learn more',
                        })}
                      </EuiLink>
                    </EuiToolTip>
                  ),
                }}
              />
            </EuiText>
          </>
        )}
      </>
    </FormRow>
  );
};
