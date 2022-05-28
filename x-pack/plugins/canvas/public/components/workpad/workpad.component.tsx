/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
// @ts-expect-error
import Style from 'style-it';
// @ts-expect-error
import { WorkpadPage } from '../workpad_page';
import { Fullscreen } from '../fullscreen';
import {
  HEADER_BANNER_HEIGHT,
  WORKPAD_CANVAS_BUFFER,
  DEFAULT_WORKPAD_CSS,
} from '../../../common/lib/constants';
import { CommitFn, CanvasPage } from '../../../types';
import { WorkpadShortcuts } from './workpad_shortcuts.component';

export interface Props {
  fetchAllRenderables: () => void;
  getAnimation: (pageNumber: number) => { name: string; direction: string } | null;
  grid: boolean;
  hasHeaderBanner?: boolean;
  height: number;
  isFullscreen: boolean;
  nextPage: () => void;
  onTransitionEnd: () => void;
  pages: CanvasPage[];
  previousPage: () => void;
  redoHistory: () => void;
  registerLayout: (newLayout: CommitFn) => void;
  resetZoom: () => void;
  selectedPageNumber: number;
  setFullscreen: (fullscreen: boolean) => void;
  setGrid: (grid: boolean) => void;
  totalElementCount: number;
  width: number;
  workpadCss: string;
  undoHistory: () => void;
  unregisterLayout: (oldLayout: CommitFn) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomScale: number;
}

export const Workpad: FC<Props> = ({
  fetchAllRenderables,
  getAnimation,
  grid,
  hasHeaderBanner,
  height,
  isFullscreen,
  nextPage,
  onTransitionEnd,
  pages,
  previousPage,
  redoHistory,
  registerLayout,
  resetZoom,
  selectedPageNumber,
  setFullscreen,
  setGrid,
  totalElementCount,
  width,
  workpadCss,
  undoHistory,
  unregisterLayout,
  zoomIn,
  zoomOut,
  zoomScale,
}) => {
  const headerBannerOffset = hasHeaderBanner ? HEADER_BANNER_HEIGHT : 0;

  const bufferStyle = {
    height: isFullscreen ? height : (height + 2 * WORKPAD_CANVAS_BUFFER) * zoomScale,
    width: isFullscreen ? width : (width + 2 * WORKPAD_CANVAS_BUFFER) * zoomScale,
  };
  return (
    <div className="canvasWorkpad__buffer" style={bufferStyle}>
      <div
        className="canvasCheckered"
        style={{
          height,
          width,
          transformOrigin: '0 0',
          transform: isFullscreen ? undefined : `scale3d(${zoomScale}, ${zoomScale}, 1)`, // don't scale in fullscreen mode
        }}
      >
        {!isFullscreen && (
          <WorkpadShortcuts
            fetchAllRenderables={fetchAllRenderables}
            grid={grid}
            isFullscreen={isFullscreen}
            nextPage={nextPage}
            previousPage={previousPage}
            redoHistory={redoHistory}
            resetZoom={resetZoom}
            setFullscreen={setFullscreen}
            setGrid={setGrid}
            undoHistory={undoHistory}
            zoomIn={zoomIn}
            zoomOut={zoomOut}
          />
        )}

        <Fullscreen>
          {({ isFullscreen: isFullscreenProp, windowSize }) => {
            const scale = Math.min(
              (windowSize.height - headerBannerOffset) / height,
              windowSize.width / width
            );

            const fsStyle = isFullscreenProp
              ? {
                  transform: `scale3d(${scale}, ${scale}, 1)`,
                  WebkitTransform: `scale3d(${scale}, ${scale}, 1)`,
                  msTransform: `scale3d(${scale}, ${scale}, 1)`,
                  height: windowSize.height < height ? 'auto' : height,
                  width: windowSize.width < width ? 'auto' : width,
                  top: hasHeaderBanner ? `${headerBannerOffset / 2}px` : undefined,
                }
              : {};

            // NOTE: the data-shared-* attributes here are used for reporting
            return Style.it(
              workpadCss || DEFAULT_WORKPAD_CSS,
              <div
                className={`canvasWorkpad ${isFullscreenProp ? 'fullscreen' : ''}`}
                style={fsStyle}
                data-shared-items-count={totalElementCount}
              >
                {pages.map((page, i) => (
                  <WorkpadPage
                    key={page.id}
                    pageId={page.id}
                    height={height}
                    width={width}
                    isSelected={i + 1 === selectedPageNumber}
                    animation={getAnimation(i + 1)}
                    onAnimationEnd={onTransitionEnd}
                    registerLayout={registerLayout}
                    unregisterLayout={unregisterLayout}
                  />
                ))}
                <div
                  className="canvasGrid"
                  style={{ height, width, display: grid ? 'block' : 'none' }}
                />
              </div>
            );
          }}
        </Fullscreen>
      </div>
    </div>
  );
};
