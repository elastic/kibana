/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<<< HEAD:x-pack/packages/kbn-elastic-assistant/impl/assistant/quick_prompts/quick_prompt_settings/helpers.tsx
import { euiPaletteColorBlind } from '@elastic/eui';

const euiVisPalette = euiPaletteColorBlind();
export const getRandomEuiColor = () => {
  const randomIndex = Math.floor(Math.random() * euiVisPalette.length);
  return euiVisPalette[randomIndex];
};
========
import * as rt from 'io-ts';

export const AssetTypeRT = rt.type({
  assetType: rt.literal('host'),
});
>>>>>>>> main:x-pack/plugins/observability_solution/infra/common/http_api/shared/asset_type.ts
