/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, PropsOf } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const ManageJobsButton: React.FunctionComponent<PropsOf<typeof EuiButton>> = (props) => (
  <EuiButton {...props}>
    <FormattedMessage
      id="xpack.infra.logs.analysis.manageMlJobsButtonLabel"
      defaultMessage="Manage ML jobs"
    />
  </EuiButton>
);
