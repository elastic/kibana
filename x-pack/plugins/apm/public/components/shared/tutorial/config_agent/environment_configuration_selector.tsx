/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableOption,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { px } from '../../../../style/variables';

export type EnvironmentConfigurationOption = EuiSelectableOption & {
  apmServerUrl?: string;
  secretToken?: string;
  checked?: 'on';
};

const StyledEuiButtomEmpty = styled(EuiButton)`
  .euiButtonContent {
    display: flex;
    justify-content: space-between;
  }
`;

interface Props {
  options: EnvironmentConfigurationOption[];
  selectedOption?: EnvironmentConfigurationOption;
  onChange: (selectedOption?: EnvironmentConfigurationOption) => void;
  fleetLink: {
    label: string;
    href: string;
  };
}

function findCheckedOption(options: EnvironmentConfigurationOption[]) {
  return options.find(({ checked }) => checked === 'on');
}

export function EnvironmentConfigurationSelector({
  options,
  selectedOption,
  onChange,
  fleetLink,
}: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [availableOptions, setAvailableOptions] = useState<
    EnvironmentConfigurationOption[]
  >(options);

  useEffect(() => {
    const checkedOption = findCheckedOption(availableOptions);
    onChange(checkedOption);
  }, [availableOptions, onChange]);

  function toggleIsPopoverOpen() {
    setIsPopoverOpen((state) => !state);
  }

  return (
    <EuiPopover
      panelPaddingSize="none"
      button={
        <StyledEuiButtomEmpty
          color="text"
          style={{ width: px(300) }}
          iconType="arrowDown"
          iconSide="right"
          onClick={toggleIsPopoverOpen}
        >
          {selectedOption?.label}
        </StyledEuiButtomEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={toggleIsPopoverOpen}
    >
      <div style={{ width: px(350) }}>
        <EuiSelectable
          searchable
          searchProps={{
            placeholder: i18n.translate(
              'xpack.apm.tutorial.config_agent.searc',
              { defaultMessage: 'Search' }
            ),
            compressed: true,
          }}
          options={availableOptions}
          onChange={(newOptions) => {
            const nextSelectedOption = findCheckedOption(newOptions);
            // When there is no checked option don't update the options so we always have at least one option selected
            if (nextSelectedOption) {
              setAvailableOptions(newOptions);
              setIsPopoverOpen(false);
            }
          }}
          singleSelection
        >
          {(list, search) => {
            return (
              <>
                <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
                {list}
                <EuiPopoverFooter paddingSize="none">
                  <EuiFlexGroup gutterSize="none">
                    <EuiFlexItem>
                      <EuiButtonEmpty
                        iconType="gear"
                        size="s"
                        href={fleetLink.href}
                      >
                        {fleetLink.label}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPopoverFooter>
              </>
            );
          }}
        </EuiSelectable>
      </div>
    </EuiPopover>
  );
}
