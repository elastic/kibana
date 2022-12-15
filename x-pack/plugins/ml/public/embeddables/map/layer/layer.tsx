/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';
import type { MapEmbeddable, ILayer } from '@kbn/maps-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiIcon,
  EuiText,
  EuiSplitPanel,
  EuiHorizontalRule,
} from '@elastic/eui';
import { CompatibleLayer } from './compatible_layer';
import { IncompatibleLayer } from './incompatible_layer';
interface Props {
  layer: ILayer;
  layerIndex: number;
  embeddable: MapEmbeddable;
}

export const Layer: FC<Props> = ({ layer, layerIndex, embeddable }) => {
  const [displayName, setDisplayName] = useState<string>('');
  const sourceDataView = useMemo(() => {
    // @ts-ignore
    const dataViews: DataView[] = embeddable?.getRoot()?.getAllDataViews() ?? [];
    return dataViews.find((dataView: DataView) => dataView.id === layer.getIndexPatternIds()[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer]);

  useEffect(() => {
    const getLayerName = async () => {
      const name = await layer.getDisplayName();
      setDisplayName(name);
    };
    // eslint-disable-next-line no-console
    getLayerName().catch(console.error);
  }, [layer]);

  return (
    <>
      <EuiSplitPanel.Outer grow>
        <EuiSplitPanel.Inner>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={'tokenGeo'} />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiText color={sourceDataView?.timeFieldName ? '' : 'subdued'}>
                <h5>{displayName}</h5>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiHorizontalRule margin="none" />
        <EuiSplitPanel.Inner grow={false} color="plain">
          {sourceDataView && sourceDataView.timeFieldName ? (
            <CompatibleLayer
              embeddable={embeddable}
              sourceDataView={sourceDataView}
              layer={layer}
              layerIndex={layerIndex}
            />
          ) : (
            <IncompatibleLayer noDataView={sourceDataView === undefined} />
          )}
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
      <EuiSpacer />
    </>
  );
};
