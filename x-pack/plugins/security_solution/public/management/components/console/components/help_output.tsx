/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, ReactNode } from 'react';
import { EuiPanel } from '@elastic/eui';
import { MaybeImmutable } from '../../../../../common/endpoint/types';
import { Command } from '..';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';

type HelpOutputProps = PropsWithChildren<{
  command: MaybeImmutable<Command>;
  title?: ReactNode;
}>;
export const HelpOutput = memo<HelpOutputProps>(({ title, children }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());

  return (
    <EuiPanel
      hasShadow={false}
      color="transparent"
      paddingSize="none"
      data-test-subj={getTestId('helpOutput')}
    >
      {children}
    </EuiPanel>
  );
});
HelpOutput.displayName = 'HelpOutput';
