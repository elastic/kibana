/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableOption,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo } from 'react';
import { DatasetFilter } from '../../../../../common/log_analysis';
import { useVisibilityState } from '../../../../utils/use_visibility_state';

export const IndexSetupDatasetFilter: React.FC<{
  availableDatasets: string[];
  datasetFilter: DatasetFilter;
  isDisabled?: boolean;
  onChangeDatasetFilter: (datasetFilter: DatasetFilter) => void;
}> = ({ availableDatasets, datasetFilter, isDisabled, onChangeDatasetFilter }) => {
  const { isVisible, hide, show } = useVisibilityState(false);

  const changeDatasetFilter = useCallback(
    (options: EuiSelectableOption[]) => {
      const selectedDatasets = options
        .filter(({ checked }) => checked === 'on')
        .map(({ label }) => label);

      onChangeDatasetFilter(
        selectedDatasets.length === 0
          ? { type: 'includeAll' }
          : { type: 'includeSome', datasets: selectedDatasets }
      );
    },
    [onChangeDatasetFilter]
  );

  const selectableOptions: EuiSelectableOption[] = useMemo(
    () =>
      availableDatasets.map((datasetName) => ({
        label: datasetName,
        checked:
          datasetFilter.type === 'includeSome' && datasetFilter.datasets.includes(datasetName)
            ? 'on'
            : undefined,
      })),
    [availableDatasets, datasetFilter]
  );

  const datasetFilterButton = (
    <EuiFilterButton disabled={isDisabled} isSelected={isVisible} onClick={show}>
      <FormattedMessage
        id="xpack.infra.analysisSetup.indexDatasetFilterIncludeAllButtonLabel"
        defaultMessage="{includeType, select, includeAll {All datasets} includeSome {{includedDatasetCount, plural, one {# dataset} other {# datasets}}}}"
        values={{
          includeType: datasetFilter.type,
          includedDatasetCount:
            datasetFilter.type === 'includeSome' ? datasetFilter.datasets.length : 0,
        }}
      />
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        button={datasetFilterButton}
        closePopover={hide}
        isOpen={isVisible}
        panelPaddingSize="none"
      >
        <EuiSelectable onChange={changeDatasetFilter} options={selectableOptions} searchable>
          {(list, search) => (
            <div>
              <EuiPopoverTitle>{search}</EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
