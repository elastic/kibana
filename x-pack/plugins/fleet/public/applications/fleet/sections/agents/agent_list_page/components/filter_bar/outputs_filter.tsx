/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { EuiHorizontalRule } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { MinimalOutput } from '../../../../../types';

interface Props {
  outputs: MinimalOutput[];
  selectedOutputs: string[];
  onSelectedOutputsChange: (selectedOutputs: string[]) => void;
}

export const OutputsFilter: React.FunctionComponent<Props> = ({
  outputs,
  selectedOutputs,
  onSelectedOutputsChange,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const [isOutputsFilterOpen, setIsOutputsFilterOpen] = useState<boolean>(false);

  const addOutputsFilter = (output: string) => {
    onSelectedOutputsChange([...selectedOutputs, output]);
  };

  const removeOutputsFilter = (output: string) => {
    onSelectedOutputsChange(selectedOutputs.filter((t) => t !== output));
  };

  const getOptions = useCallback((): EuiSelectableOption[] => {
    return outputs.map((output) => ({
      label: output?.name ?? '',
      checked: selectedOutputs.includes(output?.id ?? '') ? 'on' : undefined,
      key: output.id,
      'data-test-subj': 'agentList.outputFilterOption',
    }));
  }, [outputs, selectedOutputs]);

  const [options, setOptions] = useState<EuiSelectableOption[]>(getOptions());

  useEffect(() => {
    setOptions(getOptions());
  }, [getOptions]);

  return (
    <EuiPopover
      ownFocus
      zIndex={Number(euiTheme.levels.header) - 1}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          onClick={() => setIsOutputsFilterOpen(!isOutputsFilterOpen)}
          isSelected={isOutputsFilterOpen}
          hasActiveFilters={selectedOutputs.length > 0}
          numActiveFilters={selectedOutputs?.length}
          numFilters={outputs.length}
          disabled={outputs.length === 0}
          data-test-subj="agentList.outputsFilter"
        >
          <FormattedMessage id="xpack.fleet.agentList.outputsFilterText" defaultMessage="Outputs" />
        </EuiFilterButton>
      }
      isOpen={isOutputsFilterOpen}
      closePopover={() => setIsOutputsFilterOpen(false)}
      panelPaddingSize="none"
    >
      <EuiSelectable
        options={options as any}
        onChange={(newOptions: EuiSelectableOption[]) => {
          newOptions.forEach((option, index) => {
            if (option.checked !== options[index].checked) {
              const output = option.key!;
              if (option.checked !== 'on') {
                removeOutputsFilter(output);
                return;
              } else {
                addOutputsFilter(output);
                return;
              }
            }
          });
          setOptions(newOptions);
        }}
        data-test-subj="agentList.outputsFilterOptions"
        listProps={{
          paddingSize: 's',
          style: {
            minWidth: 140,
          },
        }}
      >
        {(list) => list}
      </EuiSelectable>
      <EuiHorizontalRule margin="none" />
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="error"
            color="danger"
            data-test-subj="agentList.outputFilterClearAllBtn"
            onClick={() => {
              onSelectedOutputsChange([]);
            }}
          >
            <FormattedMessage
              id="xpack.fleet.agentList.outputsFilterClearAllBtnText"
              defaultMessage="Clear all"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
