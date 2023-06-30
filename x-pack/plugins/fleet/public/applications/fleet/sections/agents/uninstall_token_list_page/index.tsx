/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useBreadcrumbs } from '../../../hooks';
import { DefaultLayout } from '../../../layouts';

export const UninstallTokenListPage = () => {
  useBreadcrumbs('uninstall_tokens');

  return (
    <DefaultLayout section="uninstall_tokens">
      <div>Uninstall Tokens</div>
    </DefaultLayout>
  );
};
