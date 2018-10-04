/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFilePicker } from '@elastic/eui';

export const FileUpload = ({ id = '', className = 'canvasFileUpload', onUpload }) => (
  <EuiFilePicker compressed id={id} className={className} onChange={onUpload} />
);

FileUpload.propTypes = {
  id: PropTypes.string,
  className: PropTypes.string,
  onUpload: PropTypes.func.isRequired,
};
