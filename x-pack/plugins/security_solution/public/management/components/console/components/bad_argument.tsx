/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren } from 'react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { UserCommandInput } from './user_command_input';
import { ParsedCommandInput } from '../service/parsed_command_input';
import { usageFromCommandDefinition } from '../service/usage_from_command_definition';
import { CommandDefinition } from '../types';

export type BadArgumentProps = PropsWithChildren<{
  parsedInput: ParsedCommandInput;
  commandDefinition: CommandDefinition;
}>;

export const BadArgument = memo<BadArgumentProps>(
  ({ parsedInput, commandDefinition, children = null }) => {
    return (
      <>
        <div>
          <UserCommandInput input={parsedInput.input} />
        </div>
        <EuiCallOut color="danger">
          {children}
          <EuiText size="xs">
            {'Usage: '}
            <code>{usageFromCommandDefinition(commandDefinition)}</code>
          </EuiText>
        </EuiCallOut>
      </>
    );
  }
);
BadArgument.displayName = 'BadArgument';
