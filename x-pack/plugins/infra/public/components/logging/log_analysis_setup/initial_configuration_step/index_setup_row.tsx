/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCheckbox, EuiCode, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback } from 'react';
import { DatasetFilter } from '../../../../../common/log_analysis';
import { IndexSetupDatasetFilter } from './index_setup_dataset_filter';
import { AvailableIndex, ValidationUIError } from './validation';

export const IndexSetupRow: React.FC<{
  index: AvailableIndex;
  isDisabled: boolean;
  onChangeDatasetFilter: (indexName: string, datasetFilter: DatasetFilter) => void;
  onChangeIsSelected: (indexName: string, isSelected: boolean) => void;
}> = ({ index, isDisabled, onChangeDatasetFilter, onChangeIsSelected }) => {
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

  const isSelected = index.validity === 'valid' && index.isSelected;

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiCheckbox
          key={index.name}
          id={index.name}
          label={<EuiCode>{index.name}</EuiCode>}
          onChange={changeIsSelected}
          checked={isSelected}
          disabled={isDisabled || index.validity === 'invalid'}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {index.validity === 'invalid' ? (
          <EuiToolTip content={formatValidationError(index.errors)}>
            <EuiIcon type="alert" color="danger" />
          </EuiToolTip>
        ) : index.validity === 'valid' ? (
          <IndexSetupDatasetFilter
            availableDatasets={index.availableDatasets}
            datasetFilter={index.datasetFilter}
            isDisabled={!isSelected || isDisabled}
            onChangeDatasetFilter={changeDatasetFilter}
          />
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
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
