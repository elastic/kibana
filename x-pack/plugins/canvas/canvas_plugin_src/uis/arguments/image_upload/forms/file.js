/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { Loading } from '../../../../../public/components/loading/loading';
import { FileUpload } from '../../../../../public/components/file_upload';

export const FileForm = ({ loading, onUpload }) =>
  loading ? <Loading animated text="Image uploading" /> : <FileUpload onUpload={onUpload} />;

FileForm.propTypes = {
  loading: PropTypes.bool,
  onUpload: PropTypes.func,
};
