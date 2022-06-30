/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InPortal } from 'react-reverse-portal';
import { APIKeysPortalNode } from '../../../pages/monitor_management/portals';

import { ManagementSettings } from './management_settings';

export const ManagementSettingsPortal = () => {
  return (
    <InPortal node={APIKeysPortalNode}>
      <ManagementSettings />
    </InPortal>
  );
};
