/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { euiStyled } from '../../../../../observability/public';
import { UserManagementLink } from './user_management_link';

export const MissingSetupPrivilegesPrompt: React.FunctionComponent = () => (
  <EmptyPrompt
    title={
      <h2>
        <FormattedMessage
          id="xpack.infra.logs.analysis.missingMlSetupPrivilegesTitle"
          defaultMessage="Additional Machine Learning privileges required"
        />
      </h2>
    }
    body={
      <p>
        <FormattedMessage
          id="xpack.infra.logs.analysis.missingMlSetupPrivilegesBody"
          defaultMessage="This feature makes use of Machine Learning jobs, which require the {machineLearningAdminRole} role in order to be set up."
          values={{
            machineLearningAdminRole: <EuiCode>machine_learning_admin</EuiCode>,
          }}
        />
      </p>
    }
    actions={<UserManagementLink />}
  />
);

const EmptyPrompt = euiStyled(EuiEmptyPrompt)`
  align-self: center;
`;
