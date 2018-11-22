/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Shortcuts } from 'react-shortcuts';
import { WorkpadPage } from '../workpad_page';
import { Fullscreen } from '../fullscreen';
import { setDocTitle } from '../../lib/doc_title';

export const Workpad = props => {
  const {
    selectedPageNumber,
    getAnimation,
    onTransitionEnd,
    pages,
    totalElementCount,
    workpad,
    fetchAllRenderables,
    undoHistory,
    redoHistory,
    setGrid, // TODO: Get rid of grid when we improve the layout engine
    grid,
    nextPage,
    previousPage,
    isFullscreen,
  } = props;

  const { height, width } = workpad;
  const bufferStyle = {
    height: isFullscreen ? height : height + 32,
    width: isFullscreen ? width : width + 32,
  };

  const keyHandler = action => {
    // handle keypress events for editor and presentation events
    // this exists in both contexts
    if (action === 'REFRESH') return fetchAllRenderables();

    // editor events
    if (action === 'UNDO') return undoHistory();
    if (action === 'REDO') return redoHistory();
    if (action === 'GRID') return setGrid(!grid);

    // presentation events
    if (action === 'PREV') return previousPage();
    if (action === 'NEXT') return nextPage();
  };

  setDocTitle(workpad.name);

  return (
    <div className="canvasWorkpad__buffer" style={bufferStyle}>
      <div className="canvasCheckered" style={{ height, width }}>
        {!isFullscreen && (
          <Shortcuts name="EDITOR" handler={keyHandler} targetNodeSelector="body" global />
        )}

        <Fullscreen>
          {({ isFullscreen, windowSize }) => {
            const scale = Math.min(windowSize.height / height, windowSize.width / width);
            const fsStyle = isFullscreen
              ? {
                  transform: `scale3d(${scale}, ${scale}, 1)`,
                  WebkitTransform: `scale3d(${scale}, ${scale}, 1)`,
                  msTransform: `scale3d(${scale}, ${scale}, 1)`,
                  // height,
                  // width,
                  height: windowSize.height < height ? 'auto' : height,
                  width: windowSize.width < width ? 'auto' : width,
                }
              : {};

            // NOTE: the data-shared-* attributes here are used for reporting
            return (
              <div
                className={`canvasWorkpad ${isFullscreen ? 'fullscreen' : ''}`}
                style={fsStyle}
                data-shared-items-count={totalElementCount}
              >
                {isFullscreen && (
                  <Shortcuts
                    name="PRESENTATION"
                    handler={keyHandler}
                    targetNodeSelector="body"
                    global
                  />
                )}
                {pages.map((page, i) => (
                  <WorkpadPage
                    key={page.id}
                    page={page}
                    height={height}
                    width={width}
                    isSelected={i + 1 === selectedPageNumber}
                    animation={getAnimation(i + 1)}
                    onAnimationEnd={onTransitionEnd}
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

Workpad.propTypes = {
  selectedPageNumber: PropTypes.number.isRequired,
  getAnimation: PropTypes.func.isRequired,
  onTransitionEnd: PropTypes.func.isRequired,
  grid: PropTypes.bool.isRequired,
  setGrid: PropTypes.func.isRequired,
  pages: PropTypes.array.isRequired,
  totalElementCount: PropTypes.number.isRequired,
  isFullscreen: PropTypes.bool.isRequired,
  workpad: PropTypes.object.isRequired,
  undoHistory: PropTypes.func.isRequired,
  redoHistory: PropTypes.func.isRequired,
  nextPage: PropTypes.func.isRequired,
  previousPage: PropTypes.func.isRequired,
  fetchAllRenderables: PropTypes.func.isRequired,
  style: PropTypes.object,
};
