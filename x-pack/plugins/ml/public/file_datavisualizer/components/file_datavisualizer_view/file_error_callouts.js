/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiCallOut,
} from '@elastic/eui';

import numeral from '@elastic/numeral';

const FILE_SIZE_DISPLAY_FORMAT = '0,0.[0] b';

export function FileTooLarge({ fileSize, maxFileSize }) {
  const fileSizeFormatted = numeral(fileSize).format(FILE_SIZE_DISPLAY_FORMAT);
  const maxFileSizeFormatted = numeral(maxFileSize).format(FILE_SIZE_DISPLAY_FORMAT);

  // Format the byte values, using the second format if the difference between
  // the file size and the max is so small that the formatted values are identical
  // e.g. 100.01 MB and 100.0 MB
  let errorText;
  if (fileSizeFormatted !== maxFileSizeFormatted) {
    errorText = (
      <p>
        The size of the file you selected for upload is {fileSizeFormatted} which
        exceeds the maximum permitted size of {maxFileSizeFormatted}
      </p>
    );
  } else {
    const diffFormatted = numeral(fileSize - maxFileSize).format(FILE_SIZE_DISPLAY_FORMAT);
    errorText = (
      <p>
        The size of the file you selected for upload exceeds the maximum
        permitted size of {maxFileSizeFormatted} by {diffFormatted}
      </p>
    );
  }

  return (
    <EuiCallOut
      title="File size is too large"
      color="danger"
      iconType="cross"
    >
      {errorText}
    </EuiCallOut>
  );
}

export function FileCouldNotBeRead({ error, loaded }) {
  return (
    <EuiCallOut
      title="File could not be read"
      color="danger"
      iconType="cross"
    >
      {
        (error !== undefined) &&
        <p>{error}</p>
      }
      {
        loaded &&
        <p>Reverting to previous settings</p>
      }
    </EuiCallOut>
  );
}
