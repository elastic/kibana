/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiIcon,
  EuiText,
  EuiSplitPanel,
  EuiHorizontalRule,
} from '@elastic/eui';
import type { MapApi } from '@kbn/maps-plugin/public';
import type { LayerResult } from '../../../../../application/jobs/new_job/job_from_map';
import { CompatibleLayer } from './compatible_layer';
import { IncompatibleLayer } from './incompatible_layer';

interface Props {
  layer: LayerResult;
  layerIndex: number;
  embeddable: MapApi;
}

export const Layer: FC<Props> = ({ layer, layerIndex, embeddable }) => (
  <>
    <EuiSplitPanel.Outer grow>
      <EuiSplitPanel.Inner>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={'tokenGeo'} />
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiText color={layer.dataView?.timeFieldName ? '' : 'subdued'}>
              <h5>{layer.layerDisplayName}</h5>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiHorizontalRule margin="none" />
      <EuiSplitPanel.Inner grow={false} color="plain">
        {layer.dataView && layer.dataView.timeFieldName ? (
          <CompatibleLayer embeddable={embeddable} layer={layer} layerIndex={layerIndex} />
        ) : (
          <IncompatibleLayer noDataView={layer.dataView === undefined} />
        )}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
    <EuiSpacer />
  </>
);
