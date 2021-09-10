/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { CSSProperties, useState, forwardRef, useEffect, Ref } from 'react';
import { WORKPAD_CONTAINER_ID } from '../../workpad_app';

// This adds a bit of a buffer to make room for scroll bars, etc.
const BUFFER = 24;

/**
 * The `InteractionBoundary` is a simple area which expands beyond the boundaries
 * of the `InteractiveWorkpadPage` to the corners of the `WorkpadApp`, allowing
 * mouse events started outside to fire and be tracked within.
 */
export const InteractionBoundary = forwardRef((_props: {}, ref: Ref<HTMLDivElement>) => {
  const [dimensions, setDimensions] = useState({
    height: '0',
    width: '0',
    marginLeft: '0',
    marginTop: '0',
  });

  useEffect(() => {
    const container = $('#' + WORKPAD_CONTAINER_ID);
    const height = container.height();
    const width = container.width();

    if (height && width) {
      setDimensions({
        height: height - BUFFER + 'px',
        width: width - BUFFER + 'px',
        marginLeft: -(width / 2) + BUFFER + 'px',
        marginTop: -(height / 2) + BUFFER + 'px',
      });
    }
  }, []);

  const style: CSSProperties = {
    top: '50%',
    left: '50%',
    position: 'absolute',
    ...dimensions,
  };

  return <div id="canvasInteractionBoundary" style={style} ref={ref} />;
});
