/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';

import { ImageMap } from './map/image_map';
import { useFetchClickData } from './use_fetch_click_data';
import { MonitorSelector } from './monitor_selector';

interface ImageState {
  minWidth: number; // Used for querying coordinates
  width: number;
  height: number;
  url: string; // base64 image url
}

export function ClickMap() {
  const {
    urlParams: { serviceName, environment, rangeFrom, rangeTo },
  } = useLegacyUrlParams();

  const [imageState, setImageState] = useState<ImageState>({
    minWidth: 769,
    width: 1200,
    height: 900,
    url: '',
  });

  const clickData = useFetchClickData({
    serviceName,
    environment,
    rangeFrom,
    rangeTo,
    minWidth: imageState.minWidth,
    maxWidth: imageState.width,
    referenceWidth: imageState.width,
    referenceHeight: imageState.height,
  });

  // console.log('clickData');
  // console.log(clickData);

  const handleScreenshotCapture = useCallback(
    (args) => {
      setImageState(args);
    },
    [setImageState]
  );

  return (
    <EuiFlexGroup justifyContent="spaceBetween" direction={'column'}>
      <EuiFlexItem>
        <MonitorSelector onScreenshotCapture={handleScreenshotCapture} />
      </EuiFlexItem>
      <EuiFlexItem
        css={{ alignItems: 'center', justifyContent: 'center', minHeight: 520 }}
      >
        <ImageMap
          width={812}
          height={400}
          imageUrl={imageState.url}
          clickCoordinates={clickData.clickCoordinates}
          captureWidth={clickData.innerWidth}
          captureHeight={clickData.innerHeight}
          viewportWidth={imageState.width}
          viewportHeight={imageState.height}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
