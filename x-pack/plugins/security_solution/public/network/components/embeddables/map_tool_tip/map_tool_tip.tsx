/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import { Geometry } from 'geojson';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ITooltipProperty } from '@kbn/maps-plugin/public/classes/tooltips/tooltip_property';
import { MapToolTipProps } from '../types';
import { ToolTipFooter } from './tooltip_footer';
import { LineToolTipContent } from './line_tool_tip_content';
import { PointToolTipContent } from './point_tool_tip_content';
import { Loader } from '../../../../common/components/loader';
import * as i18n from '../translations';

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
  const [featureGeometry, setFeatureGeometry] = useState<Geometry | null>(null);
  const [, setLayerName] = useState<string>('');

  const handleCloseTooltip = useCallback(() => {
    if (closeTooltip != null) {
      closeTooltip();
      setFeatureIndex(0);
    }
  }, [closeTooltip]);

  const handlePreviousFeature = useCallback(() => {
    setFeatureIndex((prevFeatureIndex) => prevFeatureIndex - 1);
    setIsLoadingNextFeature(true);
  }, []);

  const handleNextFeature = useCallback(() => {
    setFeatureIndex((prevFeatureIndex) => prevFeatureIndex + 1);
    setIsLoadingNextFeature(true);
  }, []);

  const content = useMemo(() => {
    if (isError) {
      return (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>{i18n.MAP_TOOL_TIP_ERROR}</EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (isLoading && !isLoadingNextFeature) {
      return (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
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
          />
        )}
        {features.length > 1 && (
          <ToolTipFooter
            featureIndex={featureIndex}
            totalFeatures={features.length}
            previousFeature={handlePreviousFeature}
            nextFeature={handleNextFeature}
          />
        )}
        {isLoadingNextFeature && <Loader data-test-subj="loading-panel" overlay size="m" />}
      </div>
    );
  }, [
    featureGeometry,
    featureIndex,
    featureProps,
    features,
    handleNextFeature,
    handlePreviousFeature,
    isError,
    isLoading,
    isLoadingNextFeature,
  ]);

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
            loadFeatureProperties({ layerId, properties: features[featureIndex].mbProperties }),
            getLayerName(layerId),
          ]);

          setFeatureProps(featureProperties);
          setFeatureGeometry(featureGeo);
          if (layerNameString) {
            setLayerName(layerNameString);
          }
        } catch (e) {
          setIsError(true);
        } finally {
          setIsLoading(false);
          setIsLoadingNextFeature(false);
        }
      }
    };

    fetchFeatureProps();
  }, [
    featureIndex,
    features,
    getLayerName,
    isLoadingNextFeature,
    loadFeatureGeometry,
    loadFeatureProperties,
  ]);

  return (
    <EuiOutsideClickDetector onOutsideClick={handleCloseTooltip}>{content}</EuiOutsideClickDetector>
  );
};

MapToolTipComponent.displayName = 'MapToolTipComponent';

export const MapToolTip = React.memo(MapToolTipComponent);

MapToolTip.displayName = 'MapToolTip';
