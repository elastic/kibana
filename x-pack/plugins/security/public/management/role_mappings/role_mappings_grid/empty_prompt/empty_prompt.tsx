/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ScopedHistory } from 'kibana/public';
import { CreateRoleMappingButton } from '../create_role_mapping_button';

interface EmptyPromptProps {
  history: ScopedHistory;
}

export const EmptyPrompt: React.FunctionComponent<EmptyPromptProps> = ({ history }) => (
  <EuiEmptyPrompt
    iconType="managementApp"
    title={
      <h1>
        <FormattedMessage
          id="xpack.security.management.roleMappings.emptyPromptTitle"
          defaultMessage="Create your first role mapping"
        />
      </h1>
    }
    body={
      <Fragment>
        <p>
          <FormattedMessage
            id="xpack.security.management.roleMappings.emptyPromptDescription"
            defaultMessage="Role mappings control which roles are assigned to your users."
          />
        </p>
      </Fragment>
    }
    actions={<CreateRoleMappingButton history={history} />}
    data-test-subj="roleMappingsEmptyPrompt"
  />
);
