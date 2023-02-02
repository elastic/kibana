/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import {
  CreateExceptionListItemSchema,
  EntriesArray,
} from '@kbn/securitysolution-io-ts-list-types';
import { useSecurityContext } from '../../../hooks/use_security_context';

export interface BlockListFlyoutProps {
  /**
   * Indicator file-hash value (sha256, sh1 or md5) to pass to the block list flyout.
   */
  indicatorFileHash: string;
}

/**
 * Component calling the block list flyout (retrieved from the SecuritySolution plugin via context).
 * This reuses a lot of components passed down via context from the Security Solution plugin:
 * - the flyout component: https://github.com/elastic/kibana/blob/main/x-pack/plugins/security_solution/public/management/components/artifact_list_page/components/artifact_flyout.tsx
 * - the form component: https://github.com/elastic/kibana/blob/main/x-pack/plugins/security_solution/public/management/pages/blocklist/view/components/blocklist_form.tsx
 */
export const BlockListFlyout: VFC<BlockListFlyoutProps> = ({ indicatorFileHash }) => {
  const { blockList } = useSecurityContext();
  const Component = blockList.getFlyoutComponent();
  const exceptionListApiClient = blockList.exceptionListApiClient;
  const FormComponent = blockList.getFormComponent();

  // prepopulate the for with the indicator file hash
  const entries: EntriesArray = [
    {
      field: 'file.hash.*',
      operator: 'included',
      type: 'match_any',
      value: [indicatorFileHash],
    },
  ];

  // prepare the payload to pass to the form (and then sent to the blocklist endpoint)
  const item: CreateExceptionListItemSchema = {
    description: '',
    entries,
    list_id: 'endpoint_blocklists',
    name: '',
    namespace_type: 'agnostic',
    os_types: ['windows'],
    tags: ['policy:all'],
    type: 'simple',
  };

  const props = {
    apiClient: exceptionListApiClient,
    item,
    policies: [],
    FormComponent,
    onClose: () => {},
  };

  return <Component {...props} />;
};
