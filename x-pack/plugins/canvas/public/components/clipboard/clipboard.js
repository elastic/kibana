/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import copy from 'copy-to-clipboard';

export class Clipboard extends React.PureComponent {
  static propTypes = {
    children: PropTypes.element.isRequired,
    content: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onCopy: PropTypes.func,
  };

  onClick = ev => {
    const { content, onCopy } = this.props;
    ev.preventDefault();

    const result = copy(content, { debug: true });

    if (typeof onCopy === 'function') {
      onCopy(result);
    }
  };

  render() {
    return (
      <div className="canvasClipboard" onClick={this.onClick}>
        {this.props.children}
      </div>
    );
  }
}
