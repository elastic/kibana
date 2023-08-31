/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { FullPageView } from './full_page_view';
import { FlyoutView } from './flyout_view';

export const Overview = () => {
  const { renderMode } = useAssetDetailsRenderPropsContext();

  return renderMode.mode !== 'flyout' ? <FullPageView /> : <FlyoutView />;
};
