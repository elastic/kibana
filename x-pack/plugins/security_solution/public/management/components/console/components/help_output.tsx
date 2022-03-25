/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useEffect, useState } from 'react';
import { EuiCallOut, EuiCallOutProps, EuiLoadingChart } from '@elastic/eui';
import { UserCommandInput } from './user_command_input';
import { CommandExecutionFailure } from './command_execution_failure';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';

export interface HelpOutputProps extends Pick<EuiCallOutProps, 'title'> {
  input: string;
  children: ReactNode | Promise<{ result: ReactNode }>;
}
export const HelpOutput = memo<HelpOutputProps>(({ input, children, ...euiCalloutProps }) => {
  const [content, setContent] = useState<ReactNode>(<EuiLoadingChart size="l" mono />);
  const getTestId = useTestIdGenerator(useDataTestSubj());

  useEffect(() => {
    if (children instanceof Promise) {
      (async () => {
        try {
          const response = await (children as Promise<{
            result: ReactNode;
          }>);
          setContent(response.result);
        } catch (error) {
          setContent(<CommandExecutionFailure error={error} />);
        }
      })();

      return;
    }

    setContent(children);
  }, [children]);

  return (
    <div>
      <div>
        <UserCommandInput input={input} />
      </div>
      <EuiCallOut
        {...euiCalloutProps}
        color="primary"
        size="s"
        iconType="help"
        data-test-subj={getTestId('helpOutput')}
      >
        {content}
      </EuiCallOut>
    </div>
  );
});
HelpOutput.displayName = 'HelpOutput';
