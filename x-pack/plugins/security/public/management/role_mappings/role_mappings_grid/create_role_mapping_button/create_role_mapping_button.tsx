/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';

import type { ScopedHistory } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';

import { EDIT_ROLE_MAPPING_PATH } from '../../../management_urls';

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
