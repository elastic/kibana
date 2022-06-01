/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode, EuiText } from '@elastic/eui';
import { UnsupportedMessageCallout } from './unsupported_message_callout';
import { ParsedCommandInput } from '../service/parsed_command_input';
import { CommandDefinition, CommandExecutionComponentProps } from '../types';
import { CommandInputUsage } from './command_usage';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export type BadArgumentProps = PropsWithChildren<{
  parsedInput: ParsedCommandInput;
  commandDefinition: CommandDefinition;
}>;

/**
 * Shows a bad argument error. The error message needs to be defined via the Command History Item's
 * `state.errorMessage`
 */
export const BadArgument = memo<CommandExecutionComponentProps>(({ command, setStatus, store }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());

  useEffect(() => {
    setStatus('success');
  }, [setStatus]);

  return (
    <UnsupportedMessageCallout
      header={
        <FormattedMessage
          id="xpack.securitySolution.console.badArgument.title"
          defaultMessage="Unsupported argument!"
        />
      }
      data-test-subj={getTestId('badArgument')}
    >
      <>
        {store.errorMessage}
        <CommandInputUsage commandDef={command.commandDefinition} />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.securitySolution.console.badArgument.helpMessage"
            defaultMessage="Type {helpCmd} for assistance."
            values={{
              helpCmd: <EuiCode>{`${command.commandDefinition.name} --help`}</EuiCode>,
            }}
          />
        </EuiText>
      </>
    </UnsupportedMessageCallout>
  );
});
BadArgument.displayName = 'BadArgument';
