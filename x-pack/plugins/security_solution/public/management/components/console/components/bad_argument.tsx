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
import { CommandDefinition } from '../types';
import { CommandInputUsage } from './command_usage';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

export type BadArgumentProps = PropsWithChildren<{
  parsedInput: ParsedCommandInput;
  commandDefinition: CommandDefinition;
}>;

export const BadArgument = memo<BadArgumentProps>(
  ({ parsedInput, commandDefinition, children = null }) => {
    const getTestId = useTestIdGenerator(useDataTestSubj());

    return (
      <>
        <EuiText>
          <UserCommandInput input={parsedInput.input} />
        </EuiText>
        <EuiCallOut color="danger" data-test-subj={getTestId('badArgument')}>
          {children}
          <CommandInputUsage command={commandDefinition} />
        </EuiCallOut>
      </>
    );
  }
);
BadArgument.displayName = 'BadArgument';
