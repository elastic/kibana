/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ConsoleCodeBlock } from './console_code_block';
import { getArgumentsForCommand } from '../service/parsed_command_input';
import type { CommandDefinition } from '../types';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';

export const CommandInputUsage = memo<Pick<CommandUsageProps, 'commandDef'>>(({ commandDef }) => {
  const usageHelp = useMemo(() => {
    return getArgumentsForCommand(commandDef).map((usage) => {
      return (
        <EuiText size="s">
          <EuiBadge>{commandDef.name}</EuiBadge>
          <ConsoleCodeBlock>{usage}</ConsoleCodeBlock>
        </EuiText>
      );
    });
  }, [commandDef]);

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.console.commandUsage.inputUsage"
              defaultMessage="Usage:"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <code>{usageHelp}</code>
        </EuiFlexItem>
      </EuiFlexGroup>
      {commandDef.exampleUsage && (
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.securitySolution.console.commandUsage.exampleUsage"
                defaultMessage="Example:"
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <ConsoleCodeBlock>{commandDef.exampleUsage}</ConsoleCodeBlock>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
});
CommandInputUsage.displayName = 'CommandInputUsage';

export interface CommandUsageProps {
  commandDef: CommandDefinition;
}

export const CommandUsage = memo<CommandUsageProps>(({ commandDef }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());
  const hasArgs = useMemo(() => Object.keys(commandDef.args ?? []).length > 0, [commandDef.args]);

  type CommandDetails = Array<{
    title: string;
    description: string;
  }>;

  const commandOptions = useMemo(() => {
    if (!hasArgs || !commandDef.args) {
      return {
        required: [],
        exclusiveOr: [],
        optional: [],
      };
    }

    const enteredCommands = Object.entries(commandDef.args).reduce<{
      required: CommandDetails;
      exclusiveOr: CommandDetails;
      optional: CommandDetails;
    }>(
      (acc, curr) => {
        const item = {
          title: `--${curr[0]}`,
          description: curr[1].about,
        };
        if (curr[1].required) {
          acc.required.push(item);
        } else if (curr[1].exclusiveOr) {
          acc.exclusiveOr.push(item);
        } else {
          acc.optional.push(item);
        }

        return acc;
      },
      {
        required: [],
        exclusiveOr: [],
        optional: [],
      }
    );
    return enteredCommands;
  }, [commandDef.args, hasArgs]);

  const additionalProps = useMemo(
    () => ({
      className: 'euiTruncateText',
    }),
    []
  );

  return (
    <EuiPanel color="transparent" data-test-subj={getTestId('commandUsage')}>
      <EuiText>{commandDef.about}</EuiText>
      <CommandInputUsage commandDef={commandDef} />
      {commandOptions.required && commandOptions.required.length > 0 && (
        <>
          <EuiSpacer />
          <EuiText>
            <FormattedMessage
              id="xpack.securitySolution.console.commandUsage.requiredLabel"
              defaultMessage="Required parameters:"
            />
            {commandDef.mustHaveArgs && commandDef.args && hasArgs && (
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.securitySolution.console.commandUsage.atLeastOneOptionRequiredMessage"
                  defaultMessage="Note: at least one option must be used"
                />
              </EuiText>
            )}
          </EuiText>
          {commandDef.args && (
            <EuiDescriptionList
              compressed
              type="column"
              className="descriptionList-20_80"
              listItems={commandOptions.required}
              descriptionProps={additionalProps}
              titleProps={additionalProps}
              data-test-subj={getTestId('commandUsage-options')}
            />
          )}
        </>
      )}
      {commandOptions.exclusiveOr && commandOptions.exclusiveOr.length > 0 && (
        <>
          <EuiSpacer />
          <EuiText>
            <FormattedMessage
              id="xpack.securitySolution.console.commandUsage.exclusiveOr"
              defaultMessage="Include only one of the following required parameters:"
            />
          </EuiText>
          {commandDef.args && (
            <EuiDescriptionList
              compressed
              type="column"
              className="descriptionList-20_80"
              listItems={commandOptions.exclusiveOr}
              descriptionProps={additionalProps}
              titleProps={additionalProps}
              data-test-subj={getTestId('commandUsage-options')}
            />
          )}
        </>
      )}
      {commandOptions.optional && commandOptions.optional.length > 0 && (
        <>
          <EuiSpacer />
          <EuiText>
            <FormattedMessage
              id="xpack.securitySolution.console.commandUsage.optionalLabel"
              defaultMessage="Optional parameters:"
            />
          </EuiText>
          {commandDef.args && (
            <EuiDescriptionList
              compressed
              type="column"
              className="descriptionList-20_80"
              listItems={commandOptions.optional}
              descriptionProps={additionalProps}
              titleProps={additionalProps}
              data-test-subj={getTestId('commandUsage-options')}
            />
          )}
        </>
      )}
    </EuiPanel>
  );
});
CommandUsage.displayName = 'CommandUsage';
