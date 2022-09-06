/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { ResponseActionsLog } from '../../../components/endpoint_response_actions_list/response_actions_log';
import { UX_MESSAGES } from '../../../components/endpoint_response_actions_list/translations';

export const ResponseActionsListPage = () => {
  return (
    <AdministrationListPage data-test-subj="responseActionsPage" title={UX_MESSAGES.pageTitle}>
      <ResponseActionsLog showHostNames={true} />
    </AdministrationListPage>
  );
};

ResponseActionsListPage.displayName = 'ResponseActionsListPage';
