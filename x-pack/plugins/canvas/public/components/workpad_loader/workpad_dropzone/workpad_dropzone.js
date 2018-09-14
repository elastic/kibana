/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';

export const WorkpadDropzone = ({ setDropping, onDropAccepted, onDropRejected, children }) => (
  <Dropzone
    accept="application/json"
    onDropAccepted={onDropAccepted}
    onDropRejected={onDropRejected}
    onDragEnter={() => setDropping(true)}
    onDragLeave={() => setDropping(false)}
    disableClick
    className="canvasWorkpad__dropzone"
    activeClassName="canvasWorkpad__dropzone--active"
  >
    {children}
  </Dropzone>
);

WorkpadDropzone.propTypes = {
  isDropping: PropTypes.bool.isRequired,
  setDropping: PropTypes.func.isRequired,
  onDropAccepted: PropTypes.func.isRequired,
  onDropRejected: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};
