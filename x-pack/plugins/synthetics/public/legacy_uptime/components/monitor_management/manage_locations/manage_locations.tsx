/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InPortal } from 'react-reverse-portal';
import { ManageLocationsFlyout } from './manage_locations_flyout';
import { ManageLocationsPortalNode } from '../../../pages/monitor_management/portals';

export const ManageLocationsPortal = () => {
  return (
    <InPortal node={ManageLocationsPortalNode}>
      <ManageLocationsFlyout />
    </InPortal>
  );
};
