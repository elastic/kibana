/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { AdministrationListPage } from '../../../components/administration_list_page';

export const PolicyList = memo(() => {
  return (
    <AdministrationListPage
      data-test-subj="policyListPage"
      title="Policy List"
      subtitle="list of all the policies"
    />
  );
});

PolicyList.displayName = 'PolicyList';
