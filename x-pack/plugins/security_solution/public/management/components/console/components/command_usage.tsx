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

export const CommandInputUsage = memo<Pick<CommandUsageProps, 'commandDef'>>(({ commandDef }) => {
  const usageHelp = useMemo(() => {
    return usageFromCommandDefinition(commandDef);
  }, [commandDef]);

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
          <p>
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
          </p>
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
