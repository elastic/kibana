/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toByteArray } from 'base64-js';
import fileSaver from 'file-saver';
import PropTypes from 'prop-types';
import React, { ReactElement } from 'react';
import { parseDataUrl } from '../../../common/lib/dataurl';

interface Props {
  children: ReactElement<any>;
  fileName: string;
  content: string;
}

export class Download extends React.PureComponent<Props> {
  public static propTypes = {
    children: PropTypes.element.isRequired,
    fileName: PropTypes.string.isRequired,
    content: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  };

  public onClick = () => {
    const { fileName, content } = this.props;
    const asset = parseDataUrl(content, true);

    if (asset && asset.data) {
      const assetBlob = new Blob([toByteArray(asset.data)], { type: asset.mimetype });
      const ext = asset.extension ? `.${asset.extension}` : '';
      fileSaver.saveAs(assetBlob, `canvas-${fileName}${ext}`);
    }
  };

  public render() {
    return (
      <div
        className="canvasDownload"
        onClick={this.onClick}
        onKeyPress={this.onClick}
        tabIndex={0}
        role="button"
      >
        {this.props.children}
      </div>
    );
  }
}
