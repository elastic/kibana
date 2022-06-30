/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ConsoleText } from './console_text';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export const LongRunningCommandHint = memo(() => {
  const getTestId = useTestIdGenerator(useDataTestSubj());

  return (
    <ConsoleText data-test-subj={getTestId('longRunningCommandHint')}>
      <FormattedMessage
        id="xpack.securitySolution.console.longRunningCommandHintMessage"
        defaultMessage="Hint: We are still working on this task. You may leave the console or place another command while this command is processing."
      />
    </ConsoleText>
  );
});
LongRunningCommandHint.displayName = 'LongRunningCommandHint';
