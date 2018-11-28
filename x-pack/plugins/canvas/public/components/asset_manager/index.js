/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { set } from 'lodash';
import { fromExpression, toExpression } from '@kbn/interpreter/common';
import { notify } from '../../lib/notify';
import { getAssets } from '../../state/selectors/assets';
import { removeAsset } from '../../state/actions/assets';
import { elementsRegistry } from '../../lib/elements_registry';
import { addElement } from '../../state/actions/elements';
import { getSelectedPage } from '../../state/selectors/workpad';
import { AssetManager as Component } from './asset_manager';

const mapStateToProps = state => ({
  assets: Object.values(getAssets(state)), // pull values out of assets object
  selectedPage: getSelectedPage(state),
});

const mapDispatchToProps = dispatch => ({
  addImageElement: pageId => assetId => {
    const imageElement = elementsRegistry.get('image');
    const elementAST = fromExpression(imageElement.expression);
    const selector = ['chain', '0', 'arguments', 'dataurl'];
    const subExp = [
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
    const newAST = set(elementAST, selector, subExp);
    imageElement.expression = toExpression(newAST);
    dispatch(addElement(pageId, imageElement));
  },
  removeAsset: assetId => dispatch(removeAsset(assetId)),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  return {
    ...ownProps,
    ...stateProps,
    ...dispatchProps,
    addImageElement: dispatchProps.addImageElement(stateProps.selectedPage),
  };
};

export const AssetManager = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  ),
  withProps({ copyAsset: assetId => notify.success(`Copied '${assetId}' to clipboard`) })
)(Component);
