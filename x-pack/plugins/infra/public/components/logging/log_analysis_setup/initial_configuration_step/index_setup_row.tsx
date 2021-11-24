/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox, EuiCode, EuiIconTip, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo } from 'react';
import { DatasetFilter, QualityWarning } from '../../../../../common/log_analysis';
import { IndexSetupDatasetFilter } from './index_setup_dataset_filter';
import { AvailableIndex, ValidationUIError } from './validation';

export const IndexSetupRow: React.FC<{
  index: AvailableIndex;
  isDisabled: boolean;
  onChangeDatasetFilter: (indexName: string, datasetFilter: DatasetFilter) => void;
  onChangeIsSelected: (indexName: string, isSelected: boolean) => void;
  previousQualityWarnings: QualityWarning[];
}> = ({
  index,
  isDisabled,
  onChangeDatasetFilter,
  onChangeIsSelected,
  previousQualityWarnings,
}) => {
  const changeIsSelected = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChangeIsSelected(index.name, event.currentTarget.checked);
    },
    [index.name, onChangeIsSelected]
  );

  const changeDatasetFilter = useCallback(
    (datasetFilter: DatasetFilter) => onChangeDatasetFilter(index.name, datasetFilter),
    [index.name, onChangeDatasetFilter]
  );

  const datasets = useMemo(
    () =>
      index.validity === 'valid'
        ? index.availableDatasets.map((availableDataset) => ({
            dataset: availableDataset,
            warnings: previousQualityWarnings.filter(({ dataset }) => dataset === availableDataset),
          }))
        : [],
    [index, previousQualityWarnings]
  );

  const datasetIndependentQualityWarnings = useMemo(
    () => previousQualityWarnings.filter(({ dataset }) => dataset === ''),
    [previousQualityWarnings]
  );

  const hasWarnings = useMemo(
    () =>
      datasetIndependentQualityWarnings.length > 0 ||
      datasets.some(({ warnings }) => warnings.length > 0),
    [datasetIndependentQualityWarnings, datasets]
  );

  const isSelected = index.validity === 'valid' && index.isSelected;

  return (
    <>
      <EuiCheckbox
        key={index.name}
        id={index.name}
        label={
          <>
            {index.name}
            {index.validity === 'valid' && hasWarnings ? (
              <EuiIconTip
                content={
                  <FormattedMessage
                    id="xpack.infra.logs.analsysisSetup.indexQualityWarningTooltipMessage"
                    defaultMessage="While analyzing the log messages from these indices we've detected some problems which might indicate a reduced quality of the results. Consider excluding these indices or problematic datasets from the analysis."
                  />
                }
                type="alert"
                color="warning"
              />
            ) : null}
          </>
        }
        onChange={changeIsSelected}
        checked={isSelected}
        disabled={isDisabled || index.validity === 'invalid'}
      />
      <>
        {index.validity === 'invalid' ? (
          <EuiText size="xs" color="textSubduedColor">
            {formatValidationError(index.errors)}
          </EuiText>
        ) : index.validity === 'valid' ? (
          <IndexSetupDatasetFilter
            availableDatasets={datasets}
            datasetFilter={index.datasetFilter}
            isDisabled={!isSelected || isDisabled}
            onChangeDatasetFilter={changeDatasetFilter}
          />
        ) : null}
      </>
      <EuiSpacer size="l" />
    </>
  );
};

const formatValidationError = (errors: ValidationUIError[]): React.ReactNode => {
  return errors.map((error) => {
    switch (error.error) {
      case 'INDEX_NOT_FOUND':
        return (
          <p key={`${error.error}-${error.index}`}>
            <FormattedMessage
              id="xpack.infra.analysisSetup.indicesSelectionIndexNotFound"
              defaultMessage="No indices match the pattern {index}"
              values={{ index: <EuiCode>{error.index}</EuiCode> }}
            />
          </p>
        );

      case 'FIELD_NOT_FOUND':
        return (
          <p key={`${error.error}-${error.index}-${error.field}`}>
            <FormattedMessage
              id="xpack.infra.analysisSetup.indicesSelectionNoTimestampField"
              defaultMessage="At least one index matching {index} lacks a required field {field}."
              values={{
                index: <EuiCode>{error.index}</EuiCode>,
                field: <EuiCode>{error.field}</EuiCode>,
              }}
            />
          </p>
        );

      case 'FIELD_NOT_VALID':
        return (
          <p key={`${error.error}-${error.index}-${error.field}`}>
            <FormattedMessage
              id="xpack.infra.analysisSetup.indicesSelectionTimestampNotValid"
              defaultMessage="At least one index matching {index} has a field called {field} without the correct type."
              values={{
                index: <EuiCode>{error.index}</EuiCode>,
                field: <EuiCode>{error.field}</EuiCode>,
              }}
            />
          </p>
        );

      default:
        return '';
    }
  });
};
