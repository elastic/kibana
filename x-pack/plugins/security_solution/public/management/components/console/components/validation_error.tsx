/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer } from '@elastic/eui';
import { UnsupportedMessageCallout } from './unsupported_message_callout';
import type { CommandExecutionComponentProps } from '../types';
import { CommandInputUsage } from './command_usage';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { ConsoleCodeBlock } from './console_code_block';

/**
 * Shows a validation error. The error message needs to be defined via the Command defintion's
 * `validate`
 */
export const ValidationError = memo<
  CommandExecutionComponentProps<{}, { errorMessage: ReactNode }>
>(({ command, setStatus, store }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());

  useEffect(() => {
    setStatus('success');
  }, [setStatus]);

  return (
    <UnsupportedMessageCallout
      header={
        <ConsoleCodeBlock textColor="error">
          <FormattedMessage
            id="xpack.securitySolution.console.validationError.title"
            defaultMessage="Unsupported action"
          />
        </ConsoleCodeBlock>
      }
      data-test-subj={getTestId('validationError')}
    >
      <div data-test-subj={getTestId('validationError-message')}>{store.errorMessage}</div>
      <EuiSpacer size="s" />
      <CommandInputUsage commandDef={command.commandDefinition} />
      <ConsoleCodeBlock>
        <EuiSpacer size="m" />
        <FormattedMessage
          id="xpack.securitySolution.console.validationError.helpMessage"
          defaultMessage="Enter {helpCmd} for further assistance."
          values={{
            helpCmd: (
              <ConsoleCodeBlock
                bold
                inline
              >{`${command.commandDefinition.name} --help`}</ConsoleCodeBlock>
            ),
          }}
        />
      </ConsoleCodeBlock>
    </UnsupportedMessageCallout>
  );
});
ValidationError.displayName = 'ValidationError';
