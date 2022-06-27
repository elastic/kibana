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
import { CommandDefinition } from '../types';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';

const getArgumentsForCommand = (command: CommandDefinition): string => {
  let requiredArgs = '';
  let exclusiveOrArgs = '';
  let optionalArgs = '';

  if (command.args) {
    for (const [argName, argDefinition] of Object.entries(command.args)) {
      if (argDefinition.required) {
        if (requiredArgs.length) {
          requiredArgs += ' ';
        }
        requiredArgs += `--${argName}`;
      } else if (argDefinition.exclusiveOr) {
        if (exclusiveOrArgs.length) {
          exclusiveOrArgs += ' OR ';
        }
        exclusiveOrArgs += `--${argName}`;
      } else {
        if (optionalArgs.length) {
          optionalArgs += ' ';
        }
        optionalArgs += `--${argName}`;
      }
    }
  }

  return `${requiredArgs} ${exclusiveOrArgs.length > 0 ? `ONE OF (${exclusiveOrArgs})` : ''}${
    optionalArgs.length > 0 ? `[${optionalArgs}]` : ''
  }`.trim();
};

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

  const commandOptionsOptional = useMemo(() => {
    // `command.args` only here to silence TS check
    if (!hasArgs || !commandDef.args) {
      return [];
    }

    const optionalEntries = Object.entries(commandDef.args).filter(
      (arg) => !arg[1].required && !arg[1].exclusiveOr
    );
    return optionalEntries.map(([option, { about: description }]) => ({
      title: `--${option}`,
      description,
    }));
  }, [commandDef.args, hasArgs]);

  const commandOptionsRequired = useMemo(() => {
    // `command.args` only here to silence TS check
    if (!hasArgs || !commandDef.args) {
      return [];
    }

    const optionalEntries = Object.entries(commandDef.args).filter(
      (arg) => arg[1].required && !arg[1].exclusiveOr
    );
    return optionalEntries.map(([option, { about: description }]) => ({
      title: `--${option}`,
      description,
    }));
  }, [commandDef.args, hasArgs]);

  const commandOptionsExclusiveOr = useMemo(() => {
    // `command.args` only here to silence TS check
    if (!hasArgs || !commandDef.args) {
      return [];
    }

    const optionalEntries = Object.entries(commandDef.args).filter((arg) => arg[1].exclusiveOr);
    return optionalEntries.map(([option, { about: description }]) => ({
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
      {commandOptionsRequired && commandOptionsRequired.length > 0 && (
        <>
          <EuiSpacer />
          <EuiText>
            <FormattedMessage
              id="xpack.securitySolution.console.commandUsage.optionsLabel"
              defaultMessage="Required:"
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
              listItems={commandOptionsRequired}
              descriptionProps={additionalProps}
              titleProps={additionalProps}
              data-test-subj={getTestId('commandUsage-options')}
            />
          )}
        </>
      )}
      {commandOptionsExclusiveOr && commandOptionsExclusiveOr.length > 0 && (
        <>
          <EuiSpacer />
          <EuiText>
            <FormattedMessage
              id="xpack.securitySolution.console.commandUsage.optionsLabel"
              defaultMessage="Must include one and only one:"
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
              listItems={commandOptionsExclusiveOr}
              descriptionProps={additionalProps}
              titleProps={additionalProps}
              data-test-subj={getTestId('commandUsage-options')}
            />
          )}
        </>
      )}
      {commandOptionsOptional && commandOptionsOptional.length > 0 && (
        <>
          <EuiSpacer />
          <EuiText>
            <FormattedMessage
              id="xpack.securitySolution.console.commandUsage.optionsLabel"
              defaultMessage="Optional:"
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
              listItems={commandOptionsOptional}
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
