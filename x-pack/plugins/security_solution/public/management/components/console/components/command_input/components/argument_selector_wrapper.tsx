/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';
import { useWithCommandArgumentState } from '../../../hooks/state_selectors/use_with_command_argument_state';
import type { CommandArgDefinition, CommandArgumentValueSelectorProps } from '../../../types';

const ArgumentSelectorWrapperContainer = styled.span`
  border: ${({ theme: { eui } }) => eui.euiBorderThin};
  border-radius: ${({ theme: { eui } }) => eui.euiBorderRadiusSmall};
  overflow: hidden;
  user-select: none;

  .flexGroup {
    align-items: stretch;
  }

  .selectorContainer {
    padding: 0 ${({ theme: { eui } }) => eui.euiSizeXS};
    max-width: 25vw;
    display: flex;
    align-items: center;
    height: 100%;
  }

  .argNameContainer {
    background-color: ${({ theme: { eui } }) => eui.euiFormInputGroupLabelBackground};
  }

  .argName {
    padding-left: ${({ theme: { eui } }) => eui.euiSizeXS};
    height: 100%;
    display: flex;
    align-items: center;
    white-space: nowrap;
  }
`;

// Type to ensure that `SelectorComponent` is defined
type ArgDefinitionWithRequiredSelector = Omit<CommandArgDefinition, 'SelectorComponent'> &
  Pick<Required<CommandArgDefinition>, 'SelectorComponent'>;

export interface ArgumentSelectorWrapperProps {
  argName: string;
  argIndex: number;
  argDefinition: ArgDefinitionWithRequiredSelector;
}

/**
 * handles displaying a custom argument value selector and manages its state
 */
export const ArgumentSelectorWrapper = memo<ArgumentSelectorWrapperProps>(
  ({ argName, argIndex, argDefinition: { SelectorComponent } }) => {
    const dispatch = useConsoleStateDispatch();
    const { valueText, value, store } = useWithCommandArgumentState(argName, argIndex);

    const handleSelectorComponentOnChange = useCallback<
      CommandArgumentValueSelectorProps['onChange']
    >(
      (updates) => {
        dispatch({
          type: 'updateInputCommandArgState',
          payload: {
            name: argName,
            instance: argIndex,
            state: updates,
          },
        });
      },
      [argIndex, argName, dispatch]
    );

    return (
      <ArgumentSelectorWrapperContainer className="eui-displayInlineBlock">
        <EuiFlexGroup
          className="flexGroup"
          responsive={false}
          alignItems="center"
          gutterSize="none"
        >
          <EuiFlexItem grow={false} className="argNameContainer">
            <div className="argName">
              <span>{`--${argName}=`}</span>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {/* `div` below ensures that the `SelectorComponent` does NOT inherit the styles of a `flex` container */}
            <div className="selectorContainer noThemeOverrides eui-textTruncate">
              <SelectorComponent
                value={value}
                valueText={valueText ?? ''}
                argName={argName}
                argIndex={argIndex}
                store={store}
                onChange={handleSelectorComponentOnChange}
              />
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ArgumentSelectorWrapperContainer>
    );
  }
);
ArgumentSelectorWrapper.displayName = 'ArgumentSelectorWrapper';
