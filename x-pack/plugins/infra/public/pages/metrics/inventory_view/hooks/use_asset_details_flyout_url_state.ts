/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { useUrlState } from '../../../../utils/use_url_state';

export const GET_DEFAULT_PROPERTIES: AssetDetailsFlyoutProperties = {
  detailsItemId: null,
};

const ASSET_DETAILS_FLYOUT_URL_STATE_KEY = 'assetDetailsFlyout';

export const useAssetDetailsFlyoutState = (): [
  AssetDetailsFlyoutProperties,
  AssetDetailsFlyoutPropertiesUpdater
] => {
  const [urlState, setUrlState] = useUrlState<AssetDetailsFlyoutProperties>({
    defaultState: {
      ...GET_DEFAULT_PROPERTIES,
    },
    decodeUrlState,
    encodeUrlState,
    urlStateKey: ASSET_DETAILS_FLYOUT_URL_STATE_KEY,
  });

  return [urlState, setUrlState];
};

const AssetDetailsFlyoutStateRT = rt.type({
  detailsItemId: rt.union([rt.string, rt.null]),
});

export type AssetDetailsFlyoutState = rt.TypeOf<typeof AssetDetailsFlyoutStateRT>;
export type AssetDetailsFlyoutPropertiesUpdater = (params: AssetDetailsFlyoutState) => void;

type AssetDetailsFlyoutProperties = rt.TypeOf<typeof AssetDetailsFlyoutStateRT>;

const encodeUrlState = AssetDetailsFlyoutStateRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(AssetDetailsFlyoutStateRT.decode(value), fold(constant(undefined), identity));
};
