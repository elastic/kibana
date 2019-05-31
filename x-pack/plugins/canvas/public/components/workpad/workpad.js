/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Shortcuts } from 'react-shortcuts';
import Style from 'style-it';
import { WorkpadPage } from '../workpad_page';
import { Fullscreen } from '../fullscreen';

const WORKPAD_CANVAS_BUFFER = 32; // 32px padding around the workpad

export class Workpad extends React.PureComponent {
  static propTypes = {
    selectedPageNumber: PropTypes.number.isRequired,
    getAnimation: PropTypes.func.isRequired,
    onTransitionEnd: PropTypes.func.isRequired,
    grid: PropTypes.bool.isRequired,
    setGrid: PropTypes.func.isRequired,
    pages: PropTypes.array.isRequired,
    totalElementCount: PropTypes.number.isRequired,
    isFullscreen: PropTypes.bool.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    workpadCss: PropTypes.string.isRequired,
    undoHistory: PropTypes.func.isRequired,
    redoHistory: PropTypes.func.isRequired,
    nextPage: PropTypes.func.isRequired,
    previousPage: PropTypes.func.isRequired,
    fetchAllRenderables: PropTypes.func.isRequired,
    registerLayout: PropTypes.func.isRequired,
    unregisterLayout: PropTypes.func.isRequired,
  };

  keyHandler = action => {
    const {
      fetchAllRenderables,
      undoHistory,
      redoHistory,
      nextPage,
      previousPage,
      grid, // TODO: Get rid of grid when we improve the layout engine
      setGrid,
    } = this.props;

    // handle keypress events for editor and presentation events
    // this exists in both contexts
    if (action === 'REFRESH') {
      return fetchAllRenderables();
    }

    // editor events
    if (action === 'UNDO') {
      return undoHistory();
    }
    if (action === 'REDO') {
      return redoHistory();
    }
    if (action === 'GRID') {
      return setGrid(!grid);
    }

    // presentation events
    if (action === 'PREV') {
      return previousPage();
    }
    if (action === 'NEXT') {
      return nextPage();
    }
  };

  render() {
    const {
      selectedPageNumber,
      getAnimation,
      onTransitionEnd,
      pages,
      totalElementCount,
      width,
      height,
      workpadCss,
      grid,
      isFullscreen,
      registerLayout,
      unregisterLayout,
    } = this.props;

    const bufferStyle = {
      height: isFullscreen ? height : height + WORKPAD_CANVAS_BUFFER,
      width: isFullscreen ? width : width + WORKPAD_CANVAS_BUFFER,
    };

    return (
      <div className="canvasWorkpad__buffer" style={bufferStyle}>
        <div className="canvasCheckered" style={{ height, width }}>
          {!isFullscreen && (
            <Shortcuts name="EDITOR" handler={this.keyHandler} targetNodeSelector="body" global />
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
              return Style.it(
                workpadCss,
                <div
                  className={`canvasWorkpad ${isFullscreen ? 'fullscreen' : ''}`}
                  style={fsStyle}
                  data-shared-items-count={totalElementCount}
                >
                  {isFullscreen && (
                    <Shortcuts
                      name="PRESENTATION"
                      handler={this.keyHandler}
                      targetNodeSelector="body"
                      global
                    />
                  )}
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
  }
}
