/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { get } from 'lodash';
import { encode } from '@kbn/presentation-util-plugin/public';
// @ts-expect-error untyped local
import { findExistingAsset } from '../../lib/find_existing_asset';
import { VALID_IMAGE_TYPES } from '../../../common/lib/constants';
import { getId } from '../../lib/get_id';
// @ts-expect-error untyped local
import { elementsRegistry } from '../../lib/elements_registry';
// @ts-expect-error untyped local
import { addElement } from '../../state/actions/elements';
import { getAssets } from '../../state/selectors/assets';
// @ts-expect-error untyped local
import { removeAsset, createAsset } from '../../state/actions/assets';
import { State, AssetType } from '../../../types';

import { AssetManager as Component } from './asset_manager.component';

export const AssetManager = connect(
  (state: State) => ({
    assets: getAssets(state),
  }),
  (dispatch: Dispatch) => ({
    onAddAsset: (type: string, content: string) => {
      // make the ID here and pass it into the action
      const assetId = getId('asset');
      dispatch(createAsset(type, content, assetId));

      // then return the id, so the caller knows the id that will be created
      return assetId;
    },
  }),
  (stateProps, dispatchProps, ownProps) => {
    const { assets } = stateProps;
    const { onAddAsset } = dispatchProps;

    // pull values out of assets object
    // have to cast to AssetType[] because TS doesn't know about filtering
    const assetValues = Object.values(assets).filter((asset) => !!asset) as AssetType[];

    return {
      ...ownProps,
      assets: assetValues,
      onAddAsset: (file: File) => {
        const [type, subtype] = get(file, 'type', '').split('/');
        if (type === 'image' && VALID_IMAGE_TYPES.indexOf(subtype) >= 0) {
          return encode(file).then((dataurl) => {
            const dataurlType = 'dataurl';
            const existingId = findExistingAsset(dataurlType, dataurl, assetValues);

            if (existingId) {
              return existingId;
            }

            return onAddAsset(dataurlType, dataurl);
          });
        }

        return false;
      },
    };
  }
)(Component);
