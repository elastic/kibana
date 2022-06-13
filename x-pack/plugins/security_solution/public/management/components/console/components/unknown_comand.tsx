/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo } from 'react';
import { EuiCode, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { UnsupportedMessageCallout } from './unsupported_message_callout';
import { CommandExecutionComponentProps } from '../types';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export const UnknownCommand = memo<CommandExecutionComponentProps>(({ command, setStatus }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());

  const message = useMemo(() => {
    return (
      <FormattedMessage
        id="xpack.securitySolution.console.unknownCommand.helpMessage"
        defaultMessage="The text you entered {userInput} is unsupported! Click {helpIcon} or type {helpCmd} for assistance."
        values={{
          userInput: <EuiCode>{command.input}</EuiCode>,
          helpIcon: <EuiIcon type="help" />,
          helpCmd: <EuiCode>{'help'}</EuiCode>,
        }}
      />
    );
  }, [command.input]);

  useEffect(() => {
    setStatus('success');
  }, [setStatus]);

  return (
    <UnsupportedMessageCallout
      header={
        <FormattedMessage
          id="xpack.securitySolution.console.unknownCommand.title"
          defaultMessage="Unsupported text/command!"
        />
      }
      data-test-subj={getTestId('unknownCommandError')}
    >
      {message}
    </UnsupportedMessageCallout>
  );
});
UnknownCommand.displayName = 'UnknownCommand';
