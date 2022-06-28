/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiBadge,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getArgumentsForCommand } from '../service/parsed_command_input';
import { CommandDefinition } from '../types';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';

export const CommandInputUsage = memo<Pick<CommandUsageProps, 'commandDef'>>(({ commandDef }) => {
  const usageHelp = useMemo(() => {
    return getArgumentsForCommand(commandDef);
  }, [commandDef]);

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.console.commandUsage.inputUsage"
            defaultMessage="Usage:"
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow>
        <code>
          <EuiText size="s">
            <EuiBadge>{commandDef.name}</EuiBadge>
            <EuiCode transparentBackground={true}>{usageHelp}</EuiCode>
          </EuiText>
        </code>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
CommandInputUsage.displayName = 'CommandInputUsage';

export interface CommandUsageProps {
  commandDef: CommandDefinition;
}

export const CommandUsage = memo<CommandUsageProps>(({ commandDef }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());
  const hasArgs = useMemo(() => Object.keys(commandDef.args ?? []).length > 0, [commandDef.args]);
  const commandOptions = useMemo(() => {
    // `command.args` only here to silence TS check
    if (!hasArgs || !commandDef.args) {
      return [];
    }

    return Object.entries(commandDef.args).map(([option, { about: description }]) => ({
      title: `--${option}`,
      description,
    }));
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
      {hasArgs && (
        <>
          <EuiSpacer />
          <EuiText>
            <FormattedMessage
              id="xpack.securitySolution.console.commandUsage.optionsLabel"
              defaultMessage="Options:"
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
              listItems={commandOptions}
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
