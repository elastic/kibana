/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import { FeatureGeometry, MapToolTipProps } from '../types';
import { ToolTipFooter } from './tooltip_footer';
import { LineToolTipContent } from './line_tool_tip_content';
import { PointToolTipContent } from './point_tool_tip_content';
import { Loader } from '../../../../common/components/loader';
import * as i18n from '../translations';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ITooltipProperty } from '../../../../../../maps/public/classes/tooltips/tooltip_property';

export const MapToolTipComponent = ({
  closeTooltip,
  features = [],
  getLayerName,
  loadFeatureProperties,
  loadFeatureGeometry,
}: MapToolTipProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingNextFeature, setIsLoadingNextFeature] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [featureIndex, setFeatureIndex] = useState<number>(0);
  const [featureProps, setFeatureProps] = useState<ITooltipProperty[]>([]);
  const [featureGeometry, setFeatureGeometry] = useState<FeatureGeometry | null>(null);
  const [, setLayerName] = useState<string>('');

  useEffect(() => {
    // Early return if component doesn't yet have props -- result of mounting in portal before actual rendering
    if (
      features.length === 0 ||
      getLayerName == null ||
      loadFeatureProperties == null ||
      loadFeatureGeometry == null
    ) {
      return;
    }

    // Separate loaders for initial load vs loading next feature to keep tooltip from drastically resizing
    if (!isLoadingNextFeature) {
      setIsLoading(true);
    }
    setIsError(false);

    const fetchFeatureProps = async () => {
      if (features[featureIndex] != null) {
        const layerId = features[featureIndex].layerId;
        const featureId = features[featureIndex].id;

        try {
          const featureGeo = loadFeatureGeometry({ layerId, featureId });
          const [featureProperties, layerNameString] = await Promise.all([
            loadFeatureProperties({ layerId, featureId }),
            getLayerName(layerId),
          ]);

          setFeatureProps(featureProperties);
          setFeatureGeometry(featureGeo);
          setLayerName(layerNameString);
        } catch (e) {
          setIsError(true);
        } finally {
          setIsLoading(false);
          setIsLoadingNextFeature(false);
        }
      }
    };

    fetchFeatureProps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    featureIndex,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    features
      .map((f) => `${f.id}-${f.layerId}`)
      .sort()
      .join(),
  ]);

  if (isError) {
    return (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>{i18n.MAP_TOOL_TIP_ERROR}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return isLoading && !isLoadingNextFeature ? (
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="m" />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <EuiOutsideClickDetector
      onOutsideClick={() => {
        if (closeTooltip != null) {
          closeTooltip();
          setFeatureIndex(0);
        }
      }}
    >
      <div>
        {featureGeometry != null && featureGeometry.type === 'LineString' ? (
          <LineToolTipContent
            contextId={`${features[featureIndex].layerId}-${features[featureIndex].id}-${featureIndex}`}
            featureProps={featureProps}
          />
        ) : (
          <PointToolTipContent
            contextId={`${features[featureIndex].layerId}-${features[featureIndex].id}-${featureIndex}`}
            featureProps={featureProps}
            closeTooltip={closeTooltip}
          />
        )}
        {features.length > 1 && (
          <ToolTipFooter
            featureIndex={featureIndex}
            totalFeatures={features.length}
            previousFeature={() => {
              setFeatureIndex(featureIndex - 1);
              setIsLoadingNextFeature(true);
            }}
            nextFeature={() => {
              setFeatureIndex(featureIndex + 1);
              setIsLoadingNextFeature(true);
            }}
          />
        )}
        {isLoadingNextFeature && <Loader data-test-subj="loading-panel" overlay size="m" />}
      </div>
    </EuiOutsideClickDetector>
  );
};

MapToolTipComponent.displayName = 'MapToolTipComponent';

export const MapToolTip = React.memo(MapToolTipComponent);

MapToolTip.displayName = 'MapToolTip';
