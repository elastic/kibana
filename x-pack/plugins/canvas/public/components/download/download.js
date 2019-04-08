/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import fileSaver from 'file-saver';
import { toByteArray } from 'base64-js';
import { parseDataUrl } from '../../../common/lib/dataurl';

export class Download extends React.PureComponent {
  static propTypes = {
    children: PropTypes.element.isRequired,
    fileName: PropTypes.string,
    content: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onCopy: PropTypes.func,
  };

  onClick = () => {
    const { fileName, content } = this.props;
    const asset = parseDataUrl(content, true);
    const assetBlob = new Blob([toByteArray(asset.data)], { type: asset.mimetype });
    const ext = asset.extension ? `.${asset.extension}` : '';
    fileSaver.saveAs(assetBlob, `canvas-${fileName}${ext}`);
  };

  render() {
    return (
      <div className="canvasDownload" onClick={this.onClick}>
        {this.props.children}
      </div>
    );
  }
}
