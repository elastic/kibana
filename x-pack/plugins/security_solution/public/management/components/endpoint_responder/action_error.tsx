/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CommandExecutionResultComponent } from '../console/components/command_execution_result';
import type { ImmutableArray } from '../../../../common/endpoint/types';

export const ActionError = memo<{
  errors: ImmutableArray<string>;
  title?: string;
  ResultComponent: CommandExecutionResultComponent;
  dataTestSubj?: string;
}>(({ title, dataTestSubj, errors, ResultComponent }) => {
  return (
    <ResultComponent showAs="failure" title={title} data-test-subj={dataTestSubj}>
      <FormattedMessage
        id="xpack.securitySolution.endpointResponseActions.actionError.errorMessage"
        defaultMessage="The following errors were encountered:"
      />
      <EuiSpacer size="s" />
      <div>{errors.join(' | ')}</div>
    </ResultComponent>
  );
});
ActionError.displayName = 'ActionError';
