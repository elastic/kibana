/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useWithInputTextEntered } from '../../../hooks/state_selectors/use_with_input_text_entered';
import { getArgumentsForCommand } from '../../../service/parsed_command_input';
import type { CommandDefinition } from '../../..';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';
import { useWithInputShowPopover } from '../../../hooks/state_selectors/use_with_input_show_popover';
import { useWithInputCommandEntered } from '../../../hooks/state_selectors/use_with_input_command_entered';
import { useWithCommandList } from '../../../hooks/state_selectors/use_with_command_list';

const UNKNOWN_COMMAND_HINT = (commandName: string) =>
  i18n.translate('xpack.securitySolution.useInputHints.unknownCommand', {
    defaultMessage: 'Unknown command {commandName}',
    values: { commandName },
  });

const NO_ARGUMENTS_HINT = i18n.translate('xpack.securitySolution.useInputHints.noArguments', {
  defaultMessage: 'Hit enter to execute',
});

export const UP_ARROW_ACCESS_HISTORY_HINT = i18n.translate(
  'xpack.securitySolution.useInputHints.viewInputHistory',
  { defaultMessage: 'Press the up arrow key to access previously entered commands' }
);

/**
 * Auto-generates console footer "hints" while user is interacting with the input area
 */
export const useInputHints = () => {
  const dispatch = useConsoleStateDispatch();
  const isInputPopoverOpen = Boolean(useWithInputShowPopover());
  const commandEntered = useWithInputCommandEntered();
  const commandList = useWithCommandList();
  const { textEntered } = useWithInputTextEntered();

  const commandEnteredDefinition = useMemo<CommandDefinition | undefined>(() => {
    if (commandEntered) {
      return commandList.find((commandDef) => commandDef.name === commandEntered);
    }
  }, [commandEntered, commandList]);

  useEffect(() => {
    // If we know the command name and the input popover is not opened, then show hints (if any)
    if (commandEntered && !isInputPopoverOpen) {
      // Is valid command name? ==> show usage
      if (commandEnteredDefinition && commandEnteredDefinition.helpHidden !== true) {
        const exampleInstruction = commandEnteredDefinition?.exampleInstruction ?? '';
        const exampleUsage = commandEnteredDefinition?.exampleUsage ?? '';

        let hint = exampleInstruction ?? '';

        if (exampleUsage) {
          if (exampleInstruction) {
            // leading space below is intentional
            hint += ` ${i18n.translate('xpack.securitySolution.useInputHints.exampleInstructions', {
              defaultMessage: 'Ex: [ {exampleUsage} ]',
              values: {
                exampleUsage,
              },
            })}`;
          } else {
            hint += exampleUsage;
          }
        }

        // If the command did not define any hint, then generate the command useage from the definition.
        // If the command did define `exampleInstruction` but not `exampleUsage`, then generate the
        // usage from the command definition and then append it.
        //
        // Generated usage is only created if the command has arguments.
        if (!hint || !exampleUsage) {
          const commandArguments = getArgumentsForCommand(commandEnteredDefinition);

          if (commandArguments.length > 0) {
            hint += `${commandEnteredDefinition.name} ${commandArguments}`;
          } else {
            hint += NO_ARGUMENTS_HINT;
          }
        }

        dispatch({
          type: 'updateFooterContent',
          payload: { value: hint },
        });

        dispatch({ type: 'setInputState', payload: { value: undefined } });
      } else {
        dispatch({
          type: 'updateFooterContent',
          payload: {
            value: UNKNOWN_COMMAND_HINT(commandEntered),
          },
        });

        dispatch({ type: 'setInputState', payload: { value: 'error' } });
      }
    } else {
      dispatch({
        type: 'updateFooterContent',
        payload: {
          value: textEntered || isInputPopoverOpen ? '' : UP_ARROW_ACCESS_HISTORY_HINT,
        },
      });
      dispatch({ type: 'setInputState', payload: { value: undefined } });
    }
  }, [commandEntered, commandEnteredDefinition, dispatch, isInputPopoverOpen, textEntered]);
};
