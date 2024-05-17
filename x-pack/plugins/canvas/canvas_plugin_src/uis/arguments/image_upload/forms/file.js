/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilePicker } from '@elastic/eui';
import PropTypes from 'prop-types';
import React from 'react';
import { ArgumentStrings } from '../../../../../i18n';
import { Loading } from '../../../../../public/components/loading/loading';

const { ImageUpload: strings } = ArgumentStrings;

export const FileForm = ({ loading, onChange }) =>
  loading ? (
    <Loading animated={true} text={strings.getImageUploading()} />
  ) : (
    <EuiFilePicker
      initialPromptText={strings.getFileUploadPrompt()}
      onChange={onChange}
      compressed={true}
      display="default"
      className="canvasImageUpload"
      accept="image/*"
    />
  );

FileForm.propTypes = {
  loading: PropTypes.bool,
  onUpload: PropTypes.func,
};
