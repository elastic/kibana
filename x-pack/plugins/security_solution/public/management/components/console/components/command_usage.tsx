/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { usageFromCommandDefinition } from '../service/usage_from_command_definition';
import { CommandDefinition } from '../types';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';

export const CommandInputUsage = memo<Pick<CommandUsageProps, 'command'>>(({ command }) => {
  const usageHelp = useMemo(() => {
    return usageFromCommandDefinition(command);
  }, [command]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiText>
          <FormattedMessage
            id="xpack.securitySolution.console.commandUsage.inputUsage"
            defaultMessage="Usage:"
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow>
        <code>
          <EuiText>
            <code>{usageHelp}</code>
          </EuiText>
        </code>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
CommandInputUsage.displayName = 'CommandInputUsage';

export interface CommandUsageProps {
  command: CommandDefinition;
}

export const CommandUsage = memo<CommandUsageProps>(({ command }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());
  const hasArgs = useMemo(() => Object.keys(command.args ?? []).length > 0, [command.args]);
  const commandOptions = useMemo(() => {
    // `command.args` only here to silence TS check
    if (!hasArgs || !command.args) {
      return [];
    }

    return Object.entries(command.args).map(([option, { about: description }]) => ({
      title: `--${option}`,
      description,
    }));
  }, [command.args, hasArgs]);
  const additionalProps = useMemo(
    () => ({
      className: 'euiTruncateText',
    }),
    []
  );

  return (
    <EuiPanel color="transparent" data-test-subj={getTestId('commandUsage')}>
      <EuiText>{command.about}</EuiText>
      <CommandInputUsage command={command} />
      {hasArgs && (
        <>
          <EuiSpacer />
          <p>
            <EuiText>
              <FormattedMessage
                id="xpack.securitySolution.console.commandUsage.optionsLabel"
                defaultMessage="Options:"
              />
              {command.mustHaveArgs && command.args && hasArgs && (
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.securitySolution.console.commandUsage.atLeastOneOptionRequiredMessage"
                    defaultMessage="Note: at least one option must be used"
                  />
                </EuiText>
              )}
            </EuiText>
          </p>
          {command.args && (
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
