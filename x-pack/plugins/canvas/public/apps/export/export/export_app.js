/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { WorkpadPage } from '../../../components/workpad_page';
import { Link } from '../../../components/link';

export class ExportApp extends React.PureComponent {
  static propTypes = {
    workpad: PropTypes.shape({
      id: PropTypes.string.isRequired,
      pages: PropTypes.array.isRequired,
    }).isRequired,
    selectedPageId: PropTypes.string.isRequired,
    initializeWorkpad: PropTypes.func.isRequired,
  };

  componentDidMount() {
    this.props.initializeWorkpad();
  }

  render() {
    const { workpad, selectedPageId } = this.props;
    const { pages, height, width } = workpad;
    const activePage = pages.find(page => page.id === selectedPageId);

    return (
      <div className="canvasExport">
        <div className="canvasExport__stage">
          <div className="canvasLayout__stageHeader">
            <Link name="loadWorkpad" params={{ id: this.props.workpad.id }}>
              Edit Workpad
            </Link>
          </div>
          <div className="canvasExport__stageContent">
            <WorkpadPage isSelected page={activePage} height={height} width={width} />
          </div>
        </div>
      </div>
    );
  }
}
