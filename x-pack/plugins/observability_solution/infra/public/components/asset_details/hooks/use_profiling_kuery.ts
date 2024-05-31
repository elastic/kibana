/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { HOST_FIELD } from '../../../../common/constants';
import { useAssetDetailsRenderPropsContext } from './use_asset_details_render_props';
import { useAssetDetailsUrlState } from './use_asset_details_url_state';

function buildFullProfilingKuery(assetName: string, profilingSearch?: string) {
  const defaultKuery = `${HOST_FIELD} : "${assetName}"`;
  const customKuery = profilingSearch?.trim() ?? '';

  return customKuery !== '' ? `${defaultKuery} and ${customKuery}` : defaultKuery;
}
export function useProfilingKuery() {
  const { asset } = useAssetDetailsRenderPropsContext();
  const [assetDetailsUrlState, setAssetDetailsUrlState] = useAssetDetailsUrlState();
  const [fullKuery, setFullKuery] = useState(
    buildFullProfilingKuery(asset.name, assetDetailsUrlState?.profilingSearch)
  );

  const setCustomKuery = (customKuery: string) => {
    setAssetDetailsUrlState({ profilingSearch: customKuery });
    setFullKuery(buildFullProfilingKuery(asset.name, customKuery));
  };

  return {
    fullKuery,
    customKuery: assetDetailsUrlState?.profilingSearch ?? '',
    setCustomKuery,
  } as const;
}
