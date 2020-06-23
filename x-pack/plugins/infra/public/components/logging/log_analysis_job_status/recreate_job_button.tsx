/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, PropsOf } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

export const RecreateJobButton: React.FunctionComponent<PropsOf<typeof EuiButton>> = (props) => (
  <EuiButton {...props}>
    <FormattedMessage
      id="xpack.infra.logs.analysis.recreateJobButtonLabel"
      defaultMessage="Recreate ML job"
    />
  </EuiButton>
);
