/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { RedirectWrapper } from './redirect_wrapper';
import { SiemPageName } from '../../../app/types';

export const RedirectToManagementPage = memo(() => {
  return <RedirectWrapper to={`/${SiemPageName.management}`} />;
});

RedirectToManagementPage.displayName = 'RedirectToManagementPage';
