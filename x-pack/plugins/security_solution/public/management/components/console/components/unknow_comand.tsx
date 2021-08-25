/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { UserCommandInput } from './user_command_input';

export interface UnknownCommand {
  input: string;
}
export const UnknownCommand = memo<UnknownCommand>(({ input }) => {
  return (
    <>
      <div>
        <UserCommandInput input={input} />
      </div>
      <EuiCallOut color="danger">
        {`Unknown command`}
        <EuiText size="xs">
          {'For a list of available command, enter: '}
          <code>{'help'}</code>
        </EuiText>
      </EuiCallOut>
    </>
  );
});
UnknownCommand.displayName = 'UnknownCommand';
