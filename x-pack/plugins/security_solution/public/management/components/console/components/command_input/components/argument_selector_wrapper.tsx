/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
// import { useWithCommandArgumentState } from '../../../hooks/state_selectors/use_with_command_argument_state';
import type { CommandArgDefinition } from '../../../types';

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
    // const dispatch = useConsoleStateDispatch();

    // FIXME:PT retrieve argument selector state
    // const { valueText, value } = useWithCommandArgumentState(argName);

    const valueText = 'something value Text';
    const value = 'something value';

    // FIXME:PT get `Command` (the interface that is normally passed to the execute command) from store

    const handleSelectorComponentOnChange = () => {};

    // const handleSelectorComponentOnChange = useCallback<
    //   CommandArgumentValueSelectorProps['onChange']
    // >(
    //   (updates) => {
    //     dispatch({
    //       type: 'updateInputCommandArgState',
    //       payload: {
    //         name: argName,
    //         state: updates,
    //       },
    //     });
    //   },
    //   [argName, dispatch]
    // );

    // FIXME:PT wrapper component needs to have bounds on width and overflow so that it does not disrupt the Input UI
    return (
      <span className="eui-displayInlineBlock">
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
      </span>
    );
  }
);
ArgumentSelectorWrapper.displayName = 'ArgumentSelectorWrapper';
