/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { notify } from '../../lib/notify';
import { getAssets } from '../../state/selectors/assets';
import { removeAsset } from '../../state/actions/assets';
import { AssetManager as Component } from './asset_manager';

const mapStateToProps = state => ({
  assets: Object.values(getAssets(state)), // pull values out of assets object
});

const mapDispatchToProps = {
  removeAsset,
};

export const AssetManager = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withProps({ copyAsset: assetId => notify.success(`Copied '${assetId}' to clipboard`) })
)(Component);
