/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { HostMetrics } from './host_metrics';
import { ContainerMetrics } from './container_metrics';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';

export const Metrics = () => {
  const { asset } = useAssetDetailsRenderPropsContext();

  switch (asset.type) {
    case 'host':
      return <HostMetrics />;
    case 'container':
      return <ContainerMetrics />;
    default:
      return null;
  }
};
