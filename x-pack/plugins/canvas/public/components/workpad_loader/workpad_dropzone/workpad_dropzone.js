/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';

export const WorkpadDropzone = ({ onDropAccepted, onDropRejected, disabled, children }) => (
  <Dropzone
    accept="application/json"
    onDropAccepted={onDropAccepted}
    onDropRejected={onDropRejected}
    disableClick
    disabled={disabled}
    className="canvasWorkpad__dropzone"
    activeClassName="canvasWorkpad__dropzone--active"
  >
    {children}
  </Dropzone>
);

WorkpadDropzone.propTypes = {
  onDropAccepted: PropTypes.func.isRequired,
  onDropRejected: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};
