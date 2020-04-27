/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCheckbox, EuiCode, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback } from 'react';
import { DatasetFilter, ValidatedIndex, ValidationIndicesUIError } from './validation';
import { euiStyled } from '../../../../../../observability/public';

export const IndexSetupRow: React.FC<{
  index: ValidatedIndex;
  isDisabled: boolean;
  onChangeDatasetFilter: (indexName: string, datasetFilter: DatasetFilter) => void;
  onChangeIsSelected: (indexName: string, isSelected: boolean) => void;
}> = ({ index, isDisabled, onChangeDatasetFilter, onChangeIsSelected }) => {
  const handleCheckboxChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChangeIsSelected(index.name, event.currentTarget.checked);
    },
    [index.name, onChangeIsSelected]
  );

  const checkbox = (
    <EuiCheckbox
      key={index.name}
      id={index.name}
      label={<EuiCode>{index.name}</EuiCode>}
      onChange={handleCheckboxChange}
      checked={index.validity === 'valid' && index.isSelected}
      disabled={isDisabled || index.validity === 'invalid'}
    />
  );

  return (
    <IndexSetupRowWrapper>
      {index.validity === 'valid' ? (
        checkbox
      ) : (
        <EuiToolTip content={formatValidationError(index.errors)}>{checkbox}</EuiToolTip>
      )}
    </IndexSetupRowWrapper>
  );
};

const IndexSetupRowWrapper = euiStyled.div`
  padding: ${props => props.theme.eui.paddingSizes.xs};
`;

const formatValidationError = (errors: ValidationIndicesUIError[]): React.ReactNode => {
  return errors.map(error => {
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
