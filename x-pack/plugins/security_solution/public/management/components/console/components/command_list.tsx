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
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexGrid,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CommandDefinition } from '../types';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';
import { useConsoleStateDispatch } from '../hooks/state_selectors/use_console_state_dispatch';
import { COMMON_ARGS, HELP_GROUPS } from '../service/builtin_commands';
import { getCommandNameWithArgs } from '../service/utils';
import { ConsoleCodeBlock } from './console_code_block';
import { useKibana } from '../../../../common/lib/kibana';

// @ts-expect-error TS2769
const StyledEuiBasicTable = styled(EuiBasicTable)`
  margin-top: ${({ theme: { eui } }) => eui.euiSizeS};
  .euiTableHeaderCell {
    .euiTableCellContent__text {
      color: ${({ theme: { eui } }) => eui.euiTextColor};
      font-size: ${({ theme: { eui } }) => eui.euiFontSize};
      padding-bottom: ${({ theme: { eui } }) => eui.euiSizeS};
      padding-left: ${({ theme: { eui } }) => eui.euiSizeS};
    }
  }
`;

const StyledEuiCallOut = styled(EuiCallOut)`
  margin: ${({ theme: { eui } }) => eui.euiSize};
  padding: ${({ theme: { eui } }) => eui.euiSize};
  border-radius: ${({ theme: { eui } }) => eui.euiSizeXS};
`;

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  padding-left: ${({ theme: { eui } }) => eui.euiSizeS};
`;

const StyledEuiFlexGrid = styled(EuiFlexGrid)`
  @media only screen and (min-width: ${(props) => props.theme.eui.euiBreakpoints.l}) {
    max-width: 75%;
  }
  @media only screen and (min-width: ${(props) => props.theme.eui.euiBreakpoints.xl}) {
    max-width: 50%;
  }
`;

const StyledEuiBadge = styled(EuiBadge)`
  font-size: 10px !important;
  span {
    color: ${({ theme: { eui } }) => eui.euiShadowColor} !important;
  }
`;

export interface CommandListProps {
  commands: CommandDefinition[];
  display?: 'default' | 'table';
}

export const CommandList = memo<CommandListProps>(({ commands, display = 'default' }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());
  const dispatch = useConsoleStateDispatch();
  const { docLinks } = useKibana().services;

  const allowedCommands = commands.filter((command) => command.helpHidden !== true);

  const footerMessage = useMemo(() => {
    return (
      <EuiDescriptionList
        compressed
        listItems={[
          {
            title: (
              <StyledEuiBadge>
                <ConsoleCodeBlock inline bold>
                  {COMMON_ARGS.find((current) => current.name === '--help')?.name}
                </ConsoleCodeBlock>
              </StyledEuiBadge>
            ),
            description: (
              <EuiText color="subdued" size="xs">
                <FormattedMessage
                  id="xpack.securitySolution.console.commandList.footerText"
                  defaultMessage="For more help with the individual commands use the --help argument. Ex: processes --help"
                />
              </EuiText>
            ),
          },
        ]}
      />
    );
  }, []);

  const otherCommandsGroupLabel = i18n.translate(
    'xpack.securitySolution.console.commandList.otherCommandsGroup.label',
    {
      defaultMessage: 'Other commands',
    }
  );

  const updateInputText = useCallback(
    (text) => () => {
      dispatch({
        type: 'updateInputTextEnteredState',
        payload: () => {
          return {
            leftOfCursorText: text,
            rightOfCursorText: '',
          };
        },
      });

      dispatch({ type: 'addFocusToKeyCapture' });
    },
    [dispatch]
  );

  const commandsByGroups = useMemo(() => {
    return Object.values(groupBy(allowedCommands, 'helpGroupLabel')).reduce<CommandDefinition[][]>(
      (acc, current) => {
        if (current[0].helpGroupPosition !== undefined) {
          // If it already exists just move it to the end
          if (acc[current[0].helpGroupPosition]) {
            acc[acc.length] = acc[current[0].helpGroupPosition];
          }

          acc[current[0].helpGroupPosition] = sortBy(current, 'helpCommandPosition');
        } else if (current.length) {
          acc.push(sortBy(current, 'helpCommandPosition'));
        }
        return acc;
      },
      []
    );
  }, [allowedCommands]);

  const getTableItems = useCallback(
    (
      commandsByGroup: CommandDefinition[]
    ): Array<{
      [key: string]: { name: string; about: React.ReactNode | string };
    }> => {
      if (commandsByGroup[0].helpGroupLabel === HELP_GROUPS.supporting.label) {
        return [...COMMON_ARGS, ...commandsByGroup].map((command) => ({
          [commandsByGroup[0]?.helpGroupLabel ?? otherCommandsGroupLabel]: command,
        }));
      }
      return commandsByGroup.map((command) => ({
        [commandsByGroup[0]?.helpGroupLabel ?? otherCommandsGroupLabel]: command,
      }));
    },
    [otherCommandsGroupLabel]
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
                    listItems={[
                      {
                        title: <EuiBadge>{commandNameWithArgs}</EuiBadge>,
                        description: (
                          <>
                            <EuiSpacer size="xs" />
                            <EuiText color="subdued" size="xs">
                              {command.about}
                            </EuiText>
                          </>
                        ),
                      },
                    ]}
                    data-test-subj={getTestId('commandList-command')}
                  />
                </EuiFlexItem>
                {command.helpGroupLabel !== HELP_GROUPS.supporting.label &&
                  command.helpHidden !== true &&
                  command.RenderComponent && (
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content={
                          command.helpDisabled === true
                            ? i18n.translate(
                                'xpack.securitySolution.console.commandList.disabledButtonTooltip',
                                { defaultMessage: 'Unsupported command' }
                              )
                            : i18n.translate(
                                'xpack.securitySolution.console.commandList.addButtonTooltip',
                                { defaultMessage: 'Add to text bar' }
                              )
                        }
                      >
                        <EuiButtonIcon
                          iconType="plusInCircle"
                          aria-label={`updateTextInputCommand-${command.name}`}
                          onClick={updateInputText(`${commandNameWithArgs} `)}
                          isDisabled={command.helpDisabled === true}
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
    [getTestId, otherCommandsGroupLabel, updateInputText]
  );

  const getFilteredCommands = useCallback(
    (commandsByGroup): CommandDefinition[] =>
      commandsByGroup.filter(
        (current: CommandDefinition) => current.name !== 'help' && current.name !== 'clear'
      ),
    []
  );

  if (display === 'table') {
    const calloutItems = [
      <FormattedMessage
        id="xpack.securitySolution.console.commandList.callout.multipleResponses"
        defaultMessage="You can enter consecutive response actions — no need to wait for previous actions to complete."
      />,
      <FormattedMessage
        id="xpack.securitySolution.console.commandList.callout.leavingResponder"
        defaultMessage="Leaving the response console does not terminate any actions that have been submitted."
      />,
      <FormattedMessage
        id="xpack.securitySolution.console.commandList.callout.visitSupportSections"
        defaultMessage="{learnMore} about response actions and using the console."
        values={{
          learnMore: (
            <EuiLink href={docLinks.links.securitySolution.responseActions} target="_blank">
              <FormattedMessage
                id="xpack.securitySolution.console.commandList.callout.readMoreLink"
                defaultMessage="Learn more"
              />
            </EuiLink>
          ),
        }}
      />,
    ];

    const callout = (
      <StyledEuiCallOut
        title={
          <FormattedMessage
            id="xpack.securitySolution.console.commandList.callout.title"
            defaultMessage="Helpful tips:"
          />
        }
      >
        <ul>
          {calloutItems.map((item, index) => (
            <li key={index}>
              <EuiText size="s">{item}</EuiText>
            </li>
          ))}
        </ul>
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
        {callout}
      </>
    );
  }

  return (
    <>
      <EuiSpacer size="s" />
      {commandsByGroups.map((commandsByGroup) => {
        const groupLabel = commandsByGroup[0].helpGroupLabel;
        const filteredCommands = getFilteredCommands(commandsByGroup);

        if (filteredCommands.length === 0) {
          return null;
        }

        return (
          <StyledEuiFlexGrid
            columns={3}
            responsive={false}
            gutterSize="l"
            key={groupLabel}
            direction="column"
          >
            {filteredCommands.map((command) => {
              const commandNameWithArgs = getCommandNameWithArgs(command);
              return (
                <EuiFlexItem key={command.name}>
                  <EuiDescriptionList
                    compressed
                    listItems={[
                      {
                        title: (
                          <EuiToolTip content={commandNameWithArgs}>
                            <StyledEuiBadge>
                              <ConsoleCodeBlock inline bold>
                                {commandNameWithArgs}
                              </ConsoleCodeBlock>
                            </StyledEuiBadge>
                          </EuiToolTip>
                        ),
                        description: (
                          <EuiText color="subdued" size="xs">
                            {command.about}
                          </EuiText>
                        ),
                      },
                    ]}
                    data-test-subj={getTestId('commandList-command')}
                  />
                </EuiFlexItem>
              );
            })}
          </StyledEuiFlexGrid>
        );
      })}
      <EuiSpacer size="xl" />
      {footerMessage}
    </>
  );
});
CommandList.displayName = 'CommandList';
