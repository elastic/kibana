/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { set, get } from 'lodash';
import { fromExpression, toExpression } from '@kbn/interpreter/common';
import { getAssets } from '../../state/selectors/assets';
// @ts-expect-error untyped local
import { removeAsset, createAsset } from '../../state/actions/assets';
// @ts-expect-error untyped local
import { elementsRegistry } from '../../lib/elements_registry';
// @ts-expect-error untyped local
import { addElement } from '../../state/actions/elements';
import { getSelectedPage } from '../../state/selectors/workpad';
import { encode } from '../../../common/lib/dataurl';
import { getId } from '../../lib/get_id';
// @ts-expect-error untyped local
import { findExistingAsset } from '../../lib/find_existing_asset';
import { VALID_IMAGE_TYPES } from '../../../common/lib/constants';
import { withKibana } from '../../../../../../src/plugins/kibana_react/public';
import { WithKibanaProps } from '../../';
import { AssetManager as Component, Props as AssetManagerProps } from './asset_manager';

import { State, ExpressionAstExpression, AssetType } from '../../../types';

const mapStateToProps = (state: State) => ({
  assets: getAssets(state),
  selectedPage: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch: (action: any) => void) => ({
  onAddImageElement: (pageId: string) => (assetId: string) => {
    const imageElement = elementsRegistry.get('image');
    const elementAST = fromExpression(imageElement.expression);
    const selector = ['chain', '0', 'arguments', 'dataurl'];
    const subExp: ExpressionAstExpression[] = [
      {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'asset',
            arguments: {
              _: [assetId],
            },
          },
        ],
      },
    ];
    const newAST = set<ExpressionAstExpression>(elementAST, selector, subExp);
    imageElement.expression = toExpression(newAST);
    dispatch(addElement(pageId, imageElement));
  },
  onAssetAdd: (type: string, content: string) => {
    // make the ID here and pass it into the action
    const assetId = getId('asset');
    dispatch(createAsset(type, content, assetId));

    // then return the id, so the caller knows the id that will be created
    return assetId;
  },
  onAssetDelete: (assetId: string) => dispatch(removeAsset(assetId)),
});

const mergeProps = (
  stateProps: ReturnType<typeof mapStateToProps>,
  dispatchProps: ReturnType<typeof mapDispatchToProps>,
  ownProps: AssetManagerProps
) => {
  const { assets, selectedPage } = stateProps;
  const { onAssetAdd } = dispatchProps;
  const assetValues = Object.values(assets); // pull values out of assets object

  return {
    ...ownProps,
    ...dispatchProps,
    onAddImageElement: dispatchProps.onAddImageElement(stateProps.selectedPage),
    selectedPage,
    assetValues,
    onAssetAdd: (file: File) => {
      const [type, subtype] = get(file, 'type', '').split('/');
      if (type === 'image' && VALID_IMAGE_TYPES.indexOf(subtype) >= 0) {
        return encode(file).then((dataurl) => {
          const dataurlType = 'dataurl';
          const existingId = findExistingAsset(dataurlType, dataurl, assetValues);
          if (existingId) {
            return existingId;
          }
          return onAssetAdd(dataurlType, dataurl);
        });
      }

      return false;
    },
  };
};

export const AssetManager = compose<any, any>(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withKibana,
  withProps(({ kibana }: WithKibanaProps) => ({
    onAssetCopy: (asset: AssetType) =>
      kibana.services.canvas.notify.success(`Copied '${asset.id}' to clipboard`),
  }))
)(Component);
