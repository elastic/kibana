/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Sidebar } from '../../../components/sidebar';
import { Toolbar } from '../../../components/toolbar';
import { Workpad } from '../../../components/workpad';
import { WorkpadHeader } from '../../../components/workpad_header';
import { WorkpadProgress } from './workpad_progress';

export class WorkpadApp extends React.PureComponent {
  static propTypes = {
    isWriteable: PropTypes.bool.isRequired,
    deselectElement: PropTypes.func,
    initializeWorkpad: PropTypes.func.isRequired,
  };

  state = { renderedElementCount: 0 };

  componentDidMount() {
    this.props.initializeWorkpad();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.workpad.id !== this.props.workpad.id) {
      this.props.resetRenderCount();
    }
  }

  renderedElementCount = 0;

  incrementRenderCount = () => {
    this.renderedElementCount += 1;
    console.log(this.renderedElementCount);
  };

  resetRenderCount = () => {
    this.renderedElementCount = 0;
  };

  render() {
    const { isWriteable, deselectElement, inFlight, totalElementCount } = this.props;

    return (
      <div className="canvasLayout">
        {inFlight && <WorkpadProgress value={this.renderedElementCount} max={totalElementCount} />}
        <div className="canvasLayout__rows">
          <div className="canvasLayout__cols">
            <div className="canvasLayout__stage">
              <div className="canvasLayout__stageHeader">
                <WorkpadHeader />
              </div>

              <div className="canvasLayout__stageContent" onMouseDown={deselectElement}>
                {/* NOTE: canvasWorkpadContainer is used for exporting */}
                <div className="canvasWorkpadContainer canvasLayout__stageContentOverflow">
                  <Workpad incrementRenderCount={this.incrementRenderCount} />
                </div>
              </div>
            </div>

            {isWriteable && (
              <div className="canvasLayout__sidebar hide-for-sharing">
                <Sidebar />
              </div>
            )}
          </div>

          <div className="canvasLayout__footer hide-for-sharing">
            <Toolbar />
          </div>
        </div>
      </div>
    );
  }
}
