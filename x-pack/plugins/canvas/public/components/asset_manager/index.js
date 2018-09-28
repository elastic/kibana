/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { compose, withProps } from 'recompose';
import { FormattedMessage } from '@kbn/i18n/react';
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
  withProps(({ assetId }) => ({
    copyAsset: () =>
      notify.success(
        <FormattedMessage
          id="xpack.canvas.asset.manager.assetCopiedToClipboardTitle"
          defaultMessage="Copied {assetId} to clipboard"
          values={{ assetId }}
        />
      ),
  }))
)(Component);
