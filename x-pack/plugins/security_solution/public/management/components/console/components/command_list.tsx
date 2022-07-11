/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { groupBy, sortBy } from 'lodash';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexGrid,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiCallOut,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CommandArgs, CommandDefinition } from '../types';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';
import { useConsoleStateDispatch } from '../hooks/state_selectors/use_console_state_dispatch';
import { HELP_GROUPS } from '../service/builtin_commands';

// @ts-expect-error TS2769
const StyledEuiBasicTable = styled(EuiBasicTable)`
  margin-top: ${({ theme: { eui } }) => eui.euiSizeS};
  .euiTableHeaderCell {
    .euiTableCellContent__text {
      font-size: ${({ theme: { eui } }) => eui.euiFontSize};
      padding-bottom: ${({ theme: { eui } }) => eui.euiSizeM};
      padding-left: ${({ theme: { eui } }) => eui.euiSizeS};
    }
  }
`;

const StyledEuiCallOut = styled(EuiCallOut)`
  margin-left: ${({ theme: { eui } }) => eui.euiSize};
  margin-right: ${({ theme: { eui } }) => eui.euiSizeS};
  margin-bottom: ${({ theme: { eui } }) => eui.euiSize};
`;

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  padding-left: ${({ theme: { eui } }) => eui.euiSizeS};
`;

export interface CommandListProps {
  commands: CommandDefinition[];
  display?: 'default' | 'table';
}

const COMMON_ARGS = [
  {
    name: '--comment',
    about: i18n.translate('xpack.securitySolution.console.commandList.commonArgs.comment', {
      defaultMessage: 'Add comment to any action Ex: isolate --comment your comment',
    }),
  },
  {
    name: '--help',
    about: i18n.translate('xpack.securitySolution.console.commandList.commonArgs.help', {
      defaultMessage: 'Command assistance Ex: isolate --help',
    }),
  },
];

export const CommandList = memo<CommandListProps>(({ commands, display = 'default' }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());
  const dispatch = useConsoleStateDispatch();

  const footerMessage = useMemo(() => {
    return (
      <FormattedMessage
        id="xpack.securitySolution.console.commandList.footerText"
        defaultMessage="For more details on the commands above use the {helpOption} argument. Example: {cmdExample}"
        values={{
          helpOption: <EuiCode>{'--help'}</EuiCode>,
          cmdExample: <EuiCode>{'some-command --help'}</EuiCode>,
        }}
      />
    );
  }, []);

  const otherCommandsGroupLabel = i18n.translate(
    'xpack.securitySolution.console.commandList.otherCommandsGroup.label',
    {
      defaultMessage: 'Other commands',
    }
  );

  const commandsByGroups = useMemo(() => {
    return Object.values(groupBy(commands, 'helpGroupLabel')).reduce<CommandDefinition[][]>(
      (acc, current) => {
        if (current[0].helpGroupPosition !== undefined) {
          // If it already exists just move it to the end
          if (acc[current[0].helpGroupPosition]) {
            acc[acc.length] = acc[current[0].helpGroupPosition];
          }

          acc[current[0].helpGroupPosition] = sortBy(current, 'helpCommandPosition');
        } else if (current.length) {
          acc.push(current);
        }
        return acc;
      },
      []
    );
  }, [commands]);

  const getTableItems = useCallback(
    (
      commandsByGroup: CommandDefinition[]
    ): Array<{
      [key: string]: { name: string; about: React.ElementType | string };
    }> => {
      if (commandsByGroup[0].helpGroupLabel === HELP_GROUPS.supporting.label) {
        return [...COMMON_ARGS, ...commandsByGroup].map((command) => {
          return {
            [commandsByGroup[0]?.helpGroupLabel ?? otherCommandsGroupLabel]: command,
          };
        });
      }
      return commandsByGroup.map((command) => {
        return {
          [commandsByGroup[0]?.helpGroupLabel ?? otherCommandsGroupLabel]: command,
        };
      });
    },
    [otherCommandsGroupLabel]
  );

  const getCommandNameWithArgs = useCallback((command: Partial<CommandDefinition>) => {
    if (!command.mustHaveArgs || !command.args) {
      return command.name;
    }

    let hasAnExclusiveOrArg = false;
    const primaryArgs = Object.entries(command.args).reduce<CommandArgs>((acc, [key, value]) => {
      if (value.required) {
        acc[key] = value;
        return acc;
      }
      if (value.exclusiveOr && !hasAnExclusiveOrArg) {
        hasAnExclusiveOrArg = true;
        acc[key] = value;
        return acc;
      }
      return acc;
    }, {});

    return `${command.name} --${Object.keys(primaryArgs).join(' --')}`;
  }, []);

  const updateInputText = useCallback(
    (text) => {
      dispatch({
        type: 'updateInputTextEnteredState',
        payload: () => {
          return {
            textEntered: text,
          };
        },
      });
    },
    [dispatch]
  );

  const getTableColumns = useCallback(
    (commandsByGroup) => {
      return [
        {
          field: commandsByGroup[0]?.helpGroupLabel ?? otherCommandsGroupLabel,
          name: commandsByGroup[0]?.helpGroupLabel ?? otherCommandsGroupLabel,
          render: (command: CommandDefinition) => {
            const commandNameWithArgs = getCommandNameWithArgs(command);
            return (
              <StyledEuiFlexGroup alignItems="center">
                <EuiFlexItem grow={1}>
                  <EuiDescriptionList
                    compressed
                    listItems={[
                      {
                        title: <EuiBadge>{commandNameWithArgs}</EuiBadge>,
                        description: <>{command.about}</>,
                      },
                    ]}
                    data-test-subj={getTestId('commandList-command')}
                  />
                </EuiFlexItem>
                {/* Show EuiButtonIcon if is a command */}
                {command.RenderComponent && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={i18n.translate(
                        'xpack.securitySolution.console.commandList.addButtonTooltip',
                        { defaultMessage: 'Add to text bar' }
                      )}
                    >
                      <EuiButtonIcon
                        iconType="plusInCircle"
                        aria-label={`updateTextInputCommand-${command.name}`}
                        onClick={() => updateInputText(`${commandNameWithArgs} `)}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
              </StyledEuiFlexGroup>
            );
          },
        },
      ];
    },
    [getCommandNameWithArgs, getTestId, otherCommandsGroupLabel, updateInputText]
  );

  if (display === 'table') {
    const callout = (
      <StyledEuiCallOut
        title={
          <FormattedMessage
            id="xpack.securitySolution.console.commandList.callout.title"
            defaultMessage="Do you know?"
          />
        }
      >
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.console.commandList.callout.multipleResponses"
            defaultMessage="1. You may enter multiple response actions at the same time."
          />
        </EuiText>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.console.commandList.callout.leavingResponder"
            defaultMessage="2. Leaving the responder does not abort the actions."
          />
        </EuiText>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.console.commandList.callout.visitSupportSections"
            defaultMessage="3. Visit support section to read more about manual response actions."
          />
        </EuiText>
        <EuiSpacer />
        {/* //TODO: Add link to the read more page */}
        <EuiLink>
          <FormattedMessage
            id="xpack.securitySolution.console.commandList.callout.readMoreLink"
            defaultMessage="Read more"
          />
        </EuiLink>
      </StyledEuiCallOut>
    );

    return (
      <>
        {commandsByGroups.map((commandsByGroup) => (
          <StyledEuiBasicTable
            items={getTableItems(commandsByGroup)}
            columns={getTableColumns(commandsByGroup)}
          />
        ))}
        <EuiSpacer size="s" />
        {callout}
      </>
    );
  }

  return (
    <>
      <EuiSpacer />
      {commandsByGroups.map((commandsByGroup) => {
        const groupLabel = commandsByGroup[0].helpGroupLabel;
        const groupedCommands =
          groupLabel === HELP_GROUPS.supporting.label
            ? [...commandsByGroup, ...COMMON_ARGS]
            : commandsByGroup;
        return (
          <EuiFlexGrid columns={3} responsive={false} gutterSize="m" key={groupLabel}>
            {groupedCommands.map((command) => {
              return (
                <EuiFlexItem key={command.name}>
                  <EuiDescriptionList
                    compressed
                    listItems={[
                      {
                        title: <EuiBadge>{getCommandNameWithArgs(command)}</EuiBadge>,
                        description: <>{command.about}</>,
                      },
                    ]}
                    data-test-subj={getTestId('commandList-command')}
                  />
                </EuiFlexItem>
              );
            })}
          </EuiFlexGrid>
        );
      })}
      <EuiSpacer />
      <EuiText size="s">
        <EuiTextColor color="subdued">{footerMessage}</EuiTextColor>
      </EuiText>
    </>
  );
});
CommandList.displayName = 'CommandList';
