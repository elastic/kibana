/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';
import {
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function JsonImportProgress() {
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
    >
      <EuiFlyoutHeader hasBorder className="mapLayerPanel__header">
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.maps.addLayerPanel.panelTitle"
              defaultMessage={'File indexing status'}
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <div className="mapLayerPanel__body" data-test-subj="layerAddForm">
        <div className="mapLayerPanel__bodyOverflow">
          {'Import status'}
        </div>
      </div>
      {'Repurposed footer with correct action buttons'}

    </EuiFlexGroup>
  );
}
