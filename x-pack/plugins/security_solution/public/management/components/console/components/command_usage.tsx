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
  const hasArgs = Object.keys(command.args ?? []).length > 0;

  return (
    <EuiPanel color="transparent">
      <CommandInputUsage command={command} />
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
          listItems={Object.entries(command.args).map(([option, { about: description }]) => ({
            title: `--${option}`,
            description,
          }))}
          descriptionProps={{
            className: 'euiTruncateText',
          }}
          titleProps={{
            className: 'euiTruncateText',
          }}
        />
      )}
    </EuiPanel>
  );
});
CommandUsage.displayName = 'CommandUsage';
