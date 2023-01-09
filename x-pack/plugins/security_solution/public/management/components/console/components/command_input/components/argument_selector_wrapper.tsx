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
  user-select: none;
`;

// Type to ensure that `SelectorComponent` is defined
type ArgDefinitionWithRequiredSelector = Omit<CommandArgDefinition, 'SelectorComponent'> &
  Pick<Required<CommandArgDefinition>, 'SelectorComponent'>;

export interface ArgumentSelectorWrapperProps {
  argName: string;
  argDefinition: ArgDefinitionWithRequiredSelector;
}

/**
 * handles displaying a custom argument value selector and manages its state
 */
export const ArgumentSelectorWrapper = memo<ArgumentSelectorWrapperProps>(
  ({ argName, argDefinition: { SelectorComponent } }) => {
    const dispatch = useConsoleStateDispatch();
    const { valueText, value } = useWithCommandArgumentState(argName);

    const handleSelectorComponentOnChange = useCallback<
      CommandArgumentValueSelectorProps['onChange']
    >(
      (updates) => {
        dispatch({
          type: 'updateInputCommandArgState',
          payload: {
            name: argName,
            state: updates,
          },
        });
      },
      [argName, dispatch]
    );

    // FIXME:PT wrapper component needs to have bounds on width and overflow so that it does not disrupt the Input UI
    return (
      <ArgumentSelectorWrapperContainer className="eui-displayInlineBlock">
        <EuiFlexGroup responsive={false} gutterSize="none">
          <EuiFlexItem grow={false}>{`--${argName}=`}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SelectorComponent
              value={value}
              valueText={valueText ?? ''}
              onChange={handleSelectorComponentOnChange}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </ArgumentSelectorWrapperContainer>
    );
  }
);
ArgumentSelectorWrapper.displayName = 'ArgumentSelectorWrapper';
