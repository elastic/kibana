/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { RedirectToNodeDetail } from './redirect_to_node_detail';
import { RedirectToHostDetailViaIP } from './redirect_to_host_detail_via_ip';
import { RedirectToInventory } from './redirect_to_inventory';
import { inventoryModels } from '../../../common/inventory_models';

const ITEM_TYPES = inventoryModels.map((m) => m.id).join('|');

export const LinkToMetricsPage = () => {
  return (
    <Routes>
      <Route path={`:nodeType(${ITEM_TYPES})-detail/:nodeId`} element={<RedirectToNodeDetail />} />
      <Route path={`host-detail-via-ip/:hostIp`} element={<RedirectToHostDetailViaIP />} />
      <Route path={`inventory`} element={<RedirectToInventory />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};
