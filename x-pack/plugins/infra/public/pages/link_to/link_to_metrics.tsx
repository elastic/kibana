/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import { RedirectToNodeDetail } from './redirect_to_node_detail';
import { RedirectToHostDetailViaIP } from './redirect_to_host_detail_via_ip';

export const LinkToMetricsPage = () => {
  return (
    <Routes legacySwitch={false}>
      <Route path={`:nodeType-detail/:nodeId`} element={<RedirectToNodeDetail />} />
      <Route path={`host-detail-via-ip/:hostIp`} element={<RedirectToHostDetailViaIP />} />
      <Redirect to="/" />
    </Routes>
  );
};
