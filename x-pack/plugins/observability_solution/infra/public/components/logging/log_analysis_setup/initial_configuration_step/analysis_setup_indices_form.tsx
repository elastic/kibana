/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle, EuiText, EuiFormRow, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import { QualityWarning } from '../../../../../common/log_analysis';
import { LoadingOverlayWrapper } from '../../../loading_overlay_wrapper';
import { IndexSetupRow } from './index_setup_row';
import { AvailableIndex, ValidationIndicesError } from './validation';

export const AnalysisSetupIndicesForm: React.FunctionComponent<{
  disabled?: boolean;
  indices: AvailableIndex[];
  isValidating: boolean;
  onChangeSelectedIndices: (selectedIndices: AvailableIndex[]) => void;
  previousQualityWarnings?: QualityWarning[];
  validationErrors?: ValidationIndicesError[];
}> = ({
  disabled = false,
  indices,
  isValidating,
  onChangeSelectedIndices,
  previousQualityWarnings = [],
  validationErrors = [],
}) => {
  const changeIsIndexSelected = useCallback(
    (indexName: string, isSelected: boolean) => {
      onChangeSelectedIndices(
        indices.map((index) => {
          return index.name === indexName ? { ...index, isSelected } : index;
        })
      );
    },
    [indices, onChangeSelectedIndices]
  );

  const changeDatasetFilter = useCallback(
    (indexName: string, datasetFilter) => {
      onChangeSelectedIndices(
        indices.map((index) => {
          return index.name === indexName ? { ...index, datasetFilter } : index;
        })
      );
    },
    [indices, onChangeSelectedIndices]
  );

  const isInvalid = validationErrors.length > 0;

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.infra.analysisSetup.indicesSelectionTitle"
              defaultMessage="Choose indices"
            />
          </h3>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.infra.analysisSetup.indicesSelectionDescription"
            defaultMessage="By default, Machine Learning analyzes log messages in all log indices configured for the source. You can choose to only analyze a subset of the index names. Every selected index name must match at least one index with log entries. You can also choose to only include a certain subset of datasets. Note that the dataset filter applies to all selected indices."
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <LoadingOverlayWrapper isLoading={isValidating}>
          <EuiFormRow
            fullWidth
            isInvalid={isInvalid}
            label={indicesSelectionLabel}
            labelType="legend"
          >
            <>
              {indices.map((index) => (
                <IndexSetupRow
                  index={index}
                  isDisabled={disabled}
                  key={index.name}
                  onChangeIsSelected={changeIsIndexSelected}
                  onChangeDatasetFilter={changeDatasetFilter}
                  previousQualityWarnings={previousQualityWarnings}
                />
              ))}
            </>
          </EuiFormRow>
        </LoadingOverlayWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const indicesSelectionLabel = i18n.translate('xpack.infra.analysisSetup.indicesSelectionLabel', {
  defaultMessage: 'Indices',
});
