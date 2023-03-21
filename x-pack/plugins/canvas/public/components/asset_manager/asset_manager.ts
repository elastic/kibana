/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { get } from 'lodash';
import { encode } from '@kbn/presentation-util-plugin/common';
// @ts-expect-error untyped local
import { findExistingAsset } from '../../lib/find_existing_asset';
import { VALID_IMAGE_TYPES } from '../../../common/lib/constants';
import { createAsset, notifyError } from '../../lib/assets';
import { getAssets } from '../../state/selectors/assets';
// @ts-expect-error untyped local
import { setAsset } from '../../state/actions/assets';
import { State, AssetType, CanvasWorkpad } from '../../../types';

import { AssetManager as Component } from './asset_manager.component';
import { getFullWorkpadPersisted } from '../../state/selectors/workpad';
import { pluginServices } from '../../services';

export const AssetManager = connect(
  (state: State) => ({
    assets: getAssets(state),
    workpad: getFullWorkpadPersisted(state),
  }),
  (dispatch: Dispatch) => ({
    onAddAsset: (workpad: CanvasWorkpad, type: AssetType['type'], content: AssetType['value']) => {
      // make the ID here and pass it into the action
      const asset = createAsset(type, content);
      const { notify, workpad: workpadService } = pluginServices.getServices();

      return workpadService
        .updateAssets(workpad.id, { ...workpad.assets, [asset.id]: asset })
        .then((res) => {
          dispatch(setAsset(asset));
          // then return the id, so the caller knows the id that will be created
          return asset.id;
        })
        .catch((error) => notifyError(error, notify.error));
    },
  }),
  (stateProps, dispatchProps, ownProps) => {
    const { assets, workpad } = stateProps;
    const { onAddAsset } = dispatchProps;

    // pull values out of assets object
    // have to cast to AssetType[] because TS doesn't know about filtering
    const assetValues = Object.values(assets).filter((asset) => !!asset) as AssetType[];

    return {
      ...ownProps,
      assets: assetValues,
      onAddAsset: async (file: File) => {
        const [type, subtype] = get(file, 'type', '').split('/');
        if (type === 'image' && VALID_IMAGE_TYPES.indexOf(subtype) >= 0) {
          return await encode(file).then((dataurl) => {
            const dataurlType = 'dataurl';
            const existingId = findExistingAsset(dataurlType, dataurl, assetValues);

            if (existingId) {
              return existingId;
            }

            return onAddAsset(workpad, dataurlType, dataurl);
          });
        }
      },
    };
  }
)(Component);
