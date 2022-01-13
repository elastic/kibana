/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { set } from '@elastic/safer-lodash-set';

import { fromExpression, toExpression } from '@kbn/interpreter';

// @ts-expect-error untyped local
import { elementsRegistry } from '../../lib/elements_registry';
// @ts-expect-error untyped local
import { addElement } from '../../state/actions/elements';
import { getSelectedPage } from '../../state/selectors/workpad';
// @ts-expect-error untyped local
import { removeAsset } from '../../state/actions/assets';
import { State, ExpressionAstExpression, AssetType } from '../../../types';

import { Asset as Component } from './asset.component';

export const Asset = connect(
  (state: State) => ({
    selectedPage: getSelectedPage(state),
  }),
  (dispatch: Dispatch) => ({
    onCreate: (pageId: string) => (assetId: string) => {
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
    onDelete: (asset: AssetType) => dispatch(removeAsset(asset.id)),
  }),
  (stateProps, dispatchProps, ownProps) => {
    const { onCreate, onDelete } = dispatchProps;

    return {
      ...ownProps,
      onCreate: onCreate(stateProps.selectedPage),
      onDelete,
    };
  }
)(Component);
