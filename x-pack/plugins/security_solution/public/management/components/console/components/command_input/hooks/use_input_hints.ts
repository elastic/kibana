/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { getArgumentsForCommand } from '../../../service/parsed_command_input';
import { CommandDefinition } from '../../..';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';
import { useWithInputShowPopover } from '../../../hooks/state_selectors/use_with_input_show_popover';
import { useWithInputCommandEntered } from '../../../hooks/state_selectors/use_with_input_command_entered';
import { useWithCommandList } from '../../../hooks/state_selectors/use_with_command_list';

const UNKNOWN_COMMAND_HINT = (commandName: string) =>
  i18n.translate('xpack.securitySolution.useInputHints.unknownCommand', {
    defaultMessage: 'Hint: unknown command {commandName}',
    values: { commandName },
  });

const COMMAND_USAGE_HINT = (usage: string) =>
  i18n.translate('xpack.securitySolution.useInputHints.commandUsage', {
    defaultMessage: 'Hint: {usage}',
    values: {
      usage,
    },
  });

/**
 * Auto-generates console footer "hints" while user is interacting with the input area
 */
export const useInputHints = () => {
  const dispatch = useConsoleStateDispatch();
  const isInputPopoverOpen = Boolean(useWithInputShowPopover());
  const commandEntered = useWithInputCommandEntered();
  const commandList = useWithCommandList();

  const commandEnteredDefinition = useMemo<CommandDefinition | undefined>(() => {
    if (commandEntered) {
      return commandList.find((commandDef) => commandDef.name === commandEntered);
    }
  }, [commandEntered, commandList]);

  useEffect(() => {
    // If we know the command name and the input popover is not opened, then show hints (if any)
    if (commandEntered && !isInputPopoverOpen) {
      // Is valid command name? ==> show usage
      if (commandEnteredDefinition) {
        dispatch({
          type: 'updateFooterContent',
          payload: {
            value: COMMAND_USAGE_HINT(
              `${commandEnteredDefinition.name} ${getArgumentsForCommand(commandEnteredDefinition)}`
            ),
          },
        });
      } else {
        dispatch({
          type: 'updateFooterContent',
          payload: {
            value: UNKNOWN_COMMAND_HINT(commandEntered),
          },
        });
      }
    } else {
      dispatch({ type: 'updateFooterContent', payload: { value: '' } });
    }
  }, [commandEntered, commandEnteredDefinition, dispatch, isInputPopoverOpen]);
};
