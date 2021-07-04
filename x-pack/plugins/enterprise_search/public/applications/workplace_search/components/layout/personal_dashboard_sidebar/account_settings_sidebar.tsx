/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ACCOUNT_SETTINGS_TITLE, ACCOUNT_SETTINGS_DESCRIPTION } from '../../../constants';
import { ViewContentHeader } from '../../shared/view_content_header';

export const AccountSettingsSidebar = () => {
  return (
    <ViewContentHeader title={ACCOUNT_SETTINGS_TITLE} description={ACCOUNT_SETTINGS_DESCRIPTION} />
  );
};
