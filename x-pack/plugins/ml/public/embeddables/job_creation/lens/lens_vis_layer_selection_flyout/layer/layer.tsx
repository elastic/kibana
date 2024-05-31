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
import type { LensApi } from '@kbn/lens-plugin/public';
import type { LayerResult } from '../../../../../application/jobs/new_job/job_from_lens';
import { CompatibleLayer } from './compatible_layer';
import { IncompatibleLayer } from './incompatible_layer';

interface Props {
  layer: LayerResult;
  layerIndex: number;
  embeddable: LensApi;
}

export const Layer: FC<Props> = ({ layer, layerIndex, embeddable }) => {
  return (
    <>
      <EuiSplitPanel.Outer grow>
        <EuiSplitPanel.Inner>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            {layer.icon && (
              <EuiFlexItem grow={false}>
                <EuiIcon type={layer.icon} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow>
              <EuiText color={layer.isCompatible ? '' : 'subdued'}>
                <h5>{layer.label}</h5>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiHorizontalRule margin="none" />
        <EuiSplitPanel.Inner grow={false} color="plain">
          {layer.isCompatible ? (
            <CompatibleLayer layer={layer} layerIndex={layerIndex} embeddable={embeddable} />
          ) : (
            <IncompatibleLayer layer={layer} />
          )}
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
      <EuiSpacer />
    </>
  );
};
