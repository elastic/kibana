/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ScopedHistory } from 'kibana/public';
import { EDIT_ROLE_MAPPING_PATH } from '../../../management_urls';
import { reactRouterNavigate } from '../../../../../../../../src/plugins/kibana_react/public';

interface CreateRoleMappingButtonProps {
  history: ScopedHistory;
}

export const CreateRoleMappingButton = ({ history }: CreateRoleMappingButtonProps) => {
  return (
    <EuiButton
      data-test-subj="createRoleMappingButton"
      {...reactRouterNavigate(history, EDIT_ROLE_MAPPING_PATH)}
      fill
    >
      <FormattedMessage
        id="xpack.security.management.roleMappings.createRoleMappingButton"
        defaultMessage="Create role mapping"
      />
    </EuiButton>
  );
};
