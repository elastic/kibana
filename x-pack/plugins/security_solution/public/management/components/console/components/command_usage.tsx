/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiDescriptionList, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ConsoleCodeBlock } from './console_code_block';
import { getArgumentsForCommand } from '../service/parsed_command_input';
import { CommandDefinition } from '../types';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';

export const CommandInputUsage = memo<Pick<CommandUsageProps, 'commandDef'>>(({ commandDef }) => {
  const usageHelp = useMemo(() => {
    return getArgumentsForCommand(commandDef).map((usage) => {
      return (
        <EuiText size="s">
          <ConsoleCodeBlock>{`${commandDef.name} ${usage}`}</ConsoleCodeBlock>
        </EuiText>
      );
    });
  }, [commandDef]);

  const additionalProps = useMemo(
    () => ({
      className: 'euiTruncateText',
    }),
    []
  );

  return (
    <>
      <EuiDescriptionList
        compressed
        type="column"
        className="descriptionList-20_80"
        listItems={[
          { title: <ConsoleCodeBlock>{'Usage'}</ConsoleCodeBlock>, description: usageHelp },
        ]}
        descriptionProps={additionalProps}
        titleProps={additionalProps}
      />
      <EuiSpacer size="s" />
      {commandDef.exampleUsage && (
        <EuiDescriptionList
          compressed
          type="column"
          className="descriptionList-20_80"
          listItems={[
            {
              title: <ConsoleCodeBlock>{'Example'}</ConsoleCodeBlock>,
              description: <ConsoleCodeBlock>{commandDef.exampleUsage}</ConsoleCodeBlock>,
            },
          ]}
          descriptionProps={additionalProps}
          titleProps={additionalProps}
        />
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

  const additionalProps = useMemo(
    () => ({
      className: 'euiTruncateText',
    }),
    []
  );

  type CommandDetails = Array<{
    title: React.ReactFragment;
    description: React.ReactFragment;
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
          title: <ConsoleCodeBlock bold>{`--${curr[0]}`}</ConsoleCodeBlock>,
          description: <ConsoleCodeBlock>{curr[1].about}</ConsoleCodeBlock>,
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

  return (
    <EuiPanel paddingSize="none" color="transparent" data-test-subj={getTestId('commandUsage')}>
      <EuiDescriptionList
        compressed
        type="column"
        className="descriptionList-20_80"
        listItems={[
          {
            title: <ConsoleCodeBlock>{'About'}</ConsoleCodeBlock>,
            description: <ConsoleCodeBlock>{commandDef.about}</ConsoleCodeBlock>,
          },
        ]}
        descriptionProps={additionalProps}
        titleProps={additionalProps}
        data-test-subj={getTestId('commandUsage-options')}
      />
      <EuiSpacer size="s" />
      <CommandInputUsage commandDef={commandDef} />
      {commandOptions.required && commandOptions.required.length > 0 && (
        <>
          <EuiSpacer />
          <ConsoleCodeBlock>
            <FormattedMessage
              id="xpack.securitySolution.console.commandUsage.requiredLabel"
              defaultMessage="Required parameters:"
            />
            {commandDef.mustHaveArgs && commandDef.args && hasArgs && (
              <ConsoleCodeBlock>
                <FormattedMessage
                  id="xpack.securitySolution.console.commandUsage.atLeastOneOptionRequiredMessage"
                  defaultMessage="Note: at least one option must be used"
                />
              </ConsoleCodeBlock>
            )}
          </ConsoleCodeBlock>
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
          <ConsoleCodeBlock>
            <FormattedMessage
              id="xpack.securitySolution.console.commandUsage.exclusiveOr"
              defaultMessage="Include only one of the following required parameters:"
            />
          </ConsoleCodeBlock>
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
          <ConsoleCodeBlock>
            <FormattedMessage
              id="xpack.securitySolution.console.commandUsage.optionalLabel"
              defaultMessage="Optional parameters:"
            />
          </ConsoleCodeBlock>
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
