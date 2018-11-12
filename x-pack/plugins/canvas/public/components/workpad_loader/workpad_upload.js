/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFilePicker } from '@elastic/eui';
import { uploadWorkpad } from './upload_workpad';

export const WorkpadUpload = ({ onUpload, ...rest }) => (
  <EuiFilePicker
    {...rest}
    compressed
    initialPromptText="Import workpad JSON file"
    onChange={([file]) => uploadWorkpad(file, onUpload)}
  />
);

WorkpadUpload.propTypes = {
  onUpload: PropTypes.func.isRequired,
};
