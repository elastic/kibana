/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGrid, EuiFlexItem, EuiLink, EuiImage, EuiIcon } from '@elastic/eui';

export const AssetPicker = ({ assets, selected, onChange }) => (
  <EuiFlexGrid className="canvasAssetPicker" gutterSize="s" columns={4}>
    {assets.map(asset => (
      <EuiFlexItem key={asset.id} className="canvasCheckered">
        <EuiLink
          className={`canvasAssetPicker__link`}
          disabled={asset.id === selected}
          onClick={() => onChange(asset)}
        >
          <EuiImage url={asset.value} alt="Asset thumbnail" />
          {asset.id === selected && (
            <EuiIcon className="canvasAssetPicker__selected" type="checkInCircleFilled" />
          )}
        </EuiLink>
      </EuiFlexItem>
    ))}
  </EuiFlexGrid>
);

AssetPicker.propTypes = {
  assets: PropTypes.array,
};
