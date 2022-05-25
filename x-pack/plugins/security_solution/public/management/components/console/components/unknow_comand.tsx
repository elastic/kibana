/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CommandExecutionComponentProps } from '../types';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export const UnknownCommand = memo<CommandExecutionComponentProps>(({ setStatus }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());

  useEffect(() => {
    setStatus('success');
  }, [setStatus]);

  return (
    <EuiCallOut color="danger" data-test-subj={getTestId('unknownCommandError')}>
      <EuiText>
        <FormattedMessage
          id="xpack.securitySolution.console.unknownCommand.title"
          defaultMessage="Unknown command"
        />
      </EuiText>
      <EuiText size="xs">
        <FormattedMessage
          id="xpack.securitySolution.console.unknownCommand.helpMessage"
          defaultMessage="For a list of available command, enter: {helpCmd}"
          values={{
            helpCmd: <code>{'help'}</code>,
          }}
        />
      </EuiText>
    </EuiCallOut>
  );
});
UnknownCommand.displayName = 'UnknownCommand';
