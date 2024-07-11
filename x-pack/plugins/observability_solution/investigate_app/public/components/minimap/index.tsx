/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/css';
import React, { useEffect, useState } from 'react';
import html2canvas from 'html2canvas';
import { clamp, throttle } from 'lodash';
import { findScrollableParent } from '../../utils/find_scrollable_parent';

const containerClassName = css`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: clip;
  overflow-clip-margin: 3px;
  display: flex;
`;

const scrollMarkerClassName = css`
  border: 3px solid black;
  position: absolute;
  z-index: 1;
`;

const canvasContainerClassName = css`
  margin: 0 auto;
`;

export function MiniMap({ element }: { element: HTMLElement | null }) {
  const [canvasContainerElement, setCanvasContainerElement] = useState<HTMLDivElement | null>(null);
  const [scrollMarkerElement, setScrollMarkerElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!canvasContainerElement || !element || !scrollMarkerElement) {
      return;
    }

    // reassign to prevent maybe-null warnings
    const canvasContainer = canvasContainerElement;
    const elementToMap = element;
    const scrollMarker = scrollMarkerElement;

    function repositionMarker() {
      const parent = findScrollableParent(elementToMap);
      const visibleHeight = parent.clientHeight;
      const visibleWidth = parent.clientWidth;
      const totalWidth = elementToMap.scrollWidth;
      const totalHeight = elementToMap.scrollHeight;
      const scrollLeft = parent.scrollLeft;
      const scrollTop = parent.scrollTop;

      const canvasContainerHeight = canvasContainer.clientHeight;
      const canvasContainerWidth = canvasContainer.clientWidth;

      const markerWidth = Math.round(
        clamp(visibleWidth / totalWidth, 0, 1) * canvasContainer.clientWidth
      );
      const markerHeight = Math.round(
        clamp(visibleHeight / totalHeight, 0, 1) * canvasContainer.clientHeight
      );

      const markerTop = Math.round((scrollTop / totalHeight) * canvasContainerHeight);
      const markerLeft =
        Math.round((scrollLeft / totalWidth) * canvasContainerWidth) +
        (canvasContainer.parentElement!.clientWidth - canvasContainerWidth) / 2;

      scrollMarker.setAttribute(
        'style',
        `width: ${markerWidth}px; height: ${markerHeight}px; left: ${markerLeft}px; top: ${markerTop}px;`
      );
    }

    function redraw() {
      const maxAvailableHeight = canvasContainer.parentElement!.clientHeight;
      const maxAvailableWidth = canvasContainer.parentElement!.clientWidth;

      const scale = Math.min(
        maxAvailableWidth / elementToMap.scrollWidth,
        maxAvailableHeight / elementToMap.scrollHeight
      );

      html2canvas(elementToMap, {
        logging: false,
        scale,
        width: elementToMap.scrollWidth,
        height: elementToMap.scrollHeight,
      })
        .then((canvasElement) => {
          if (canvasContainer.children[0]) {
            canvasContainer.removeChild(canvasContainer.children[0]);
          }
          const canvasWidth = elementToMap.scrollWidth * scale;
          const canvasHeight = elementToMap.scrollHeight * scale;
          canvasElement.setAttribute(
            'style',
            `width: ${canvasWidth}px !important; height: ${canvasHeight}px !important  ;`
          );
          canvasContainer.setAttribute(
            'style',
            `width: ${canvasWidth}px; height: ${canvasHeight}px`
          );
          canvasContainer.appendChild(canvasElement);

          repositionMarker();
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error(error);
        });
    }

    const redrawThrottled = throttle(redraw, 1000);
    const repositionMarkerThrottled = throttle(repositionMarker, 50);

    const resizeObserver = new ResizeObserver(() => {
      redrawThrottled();
      repositionMarkerThrottled();
    });

    const mutationObserver = new MutationObserver(() => {
      redrawThrottled();
      repositionMarkerThrottled();
    });

    resizeObserver.observe(elementToMap);
    mutationObserver.observe(elementToMap, { childList: true, attributes: true });

    redrawThrottled();

    function onScroll() {
      repositionMarkerThrottled();
    }

    window.addEventListener('scroll', onScroll, true);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [element, canvasContainerElement, scrollMarkerElement]);
  return (
    <div className={containerClassName}>
      <div
        className={scrollMarkerClassName}
        ref={(instance) => {
          setScrollMarkerElement(instance);
        }}
      />
      <div
        className={canvasContainerClassName}
        ref={(nextCanvasElement) => {
          setCanvasContainerElement(nextCanvasElement);
        }}
      />
    </div>
  );
}
