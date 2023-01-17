/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled, { createGlobalStyle } from 'styled-components';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';
import { useWithCommandArgumentState } from '../../../hooks/state_selectors/use_with_command_argument_state';
import type { CommandArgDefinition, CommandArgumentValueSelectorProps } from '../../../types';

const ArgumentSelectorWrapperContainer = styled.span`
  user-select: none;

  .selectorContainer {
    max-width: 25vw;
    display: flex;
    align-items: center;
    height: 100%;
  }
`;

// FIXME:PT Delete below. Only here for DEV purposes
const DevUxStyles = createGlobalStyle<{ theme: { eui: { euiColorPrimary: string } } }>`

  body {

    &.style1 .argSelectorWrapper {
      .style1-hide {
        display: none;
      }

      .selectorContainer {
        border: ${({ theme: { eui } }) => eui.euiBorderThin};
        border-radius: ${({ theme: { eui } }) => eui.euiBorderRadiusSmall};
        padding: 0 ${({ theme: { eui } }) => eui.euiSizeXS};
      }
    }

    &.style2 {
      .argSelectorWrapper {
        border: ${({ theme: { eui } }) => eui.euiBorderThin};
        border-radius: ${({ theme: { eui } }) => eui.euiBorderRadiusSmall};
        overflow: hidden;

        & > .euiFlexGroup {
          align-items: stretch;
        }

        .style2-hide {
          display: none;
        }

        .argNameContainer {
          background-color: ${({ theme: { eui } }) => eui.euiFormInputGroupLabelBackground};
        }

        .argName {
          padding-left: ${({ theme: { eui } }) => eui.euiSizeXS};
          height: 100%;
          display: flex;
          align-items: center;
        }
        .selectorContainer {
          padding: 0 ${({ theme: { eui } }) => eui.euiSizeXS};
        }
      }
    }
  }
`;

// Type to ensure that `SelectorComponent` is defined
type ArgDefinitionWithRequiredSelector = Omit<CommandArgDefinition, 'SelectorComponent'> &
  Pick<Required<CommandArgDefinition>, 'SelectorComponent'>;

export interface ArgumentSelectorWrapperProps {
  argName: string;
  argInstance: number;
  argDefinition: ArgDefinitionWithRequiredSelector;
}

/**
 * handles displaying a custom argument value selector and manages its state
 */
export const ArgumentSelectorWrapper = memo<ArgumentSelectorWrapperProps>(
  ({ argName, argInstance, argDefinition: { SelectorComponent } }) => {
    const dispatch = useConsoleStateDispatch();
    const { valueText, value } = useWithCommandArgumentState(argName, argInstance);

    const handleSelectorComponentOnChange = useCallback<
      CommandArgumentValueSelectorProps['onChange']
    >(
      (updates) => {
        dispatch({
          type: 'updateInputCommandArgState',
          payload: {
            name: argName,
            instance: argInstance,
            state: updates,
          },
        });
      },
      [argInstance, argName, dispatch]
    );

    return (
      <ArgumentSelectorWrapperContainer className="eui-displayInlineBlock argSelectorWrapper">
        <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false} className="argNameContainer">
            <div className="argName">
              <span>{`--${argName}=`}</span>
              <span className="style1-hide style2-hide">{'"'}</span>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {/* `div` below ensures that the `SelectorComponent` does NOT inherit the styles of a `flex` container */}
            <div className="selectorContainer eui-textTruncate">
              <SelectorComponent
                value={value}
                valueText={valueText ?? ''}
                onChange={handleSelectorComponentOnChange}
              />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false} className="style1-hide style2-hide">
            {'"'}
          </EuiFlexItem>
        </EuiFlexGroup>

        <DevUxStyles />
      </ArgumentSelectorWrapperContainer>
    );
  }
);
ArgumentSelectorWrapper.displayName = 'ArgumentSelectorWrapper';
