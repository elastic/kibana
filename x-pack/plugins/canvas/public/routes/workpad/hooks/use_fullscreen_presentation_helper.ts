/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext, useEffect } from 'react';
import { useServices } from '../../../services';
import { WorkpadRoutingContext } from '..';

const fullscreenClass = 'canvas-isFullscreen';

export const useFullscreenPresentationHelper = () => {
  const { isFullscreen } = useContext(WorkpadRoutingContext);
  const services = useServices();
  const { setFullscreen } = services.platform;

  useEffect(() => {
    const body = document.querySelector('body');
    const bodyClassList = body!.classList;
    const hasFullscreenClass = bodyClassList.contains(fullscreenClass);

    if (isFullscreen && !hasFullscreenClass) {
      setFullscreen(false);
      bodyClassList.add(fullscreenClass);
    } else if (!isFullscreen && hasFullscreenClass) {
      bodyClassList.remove(fullscreenClass);
      setFullscreen(true);
    }
  }, [isFullscreen, setFullscreen]);
};
