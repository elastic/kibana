/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

export const FilesProgress = ({ filesPercent, filesDone, filesTotal }) => {
  return (
    <Fragment>
      {filesPercent}<br />
      {filesDone} / {filesTotal}
    </Fragment>
  );
};

export const BytesProgress = ({ bytesPercent, bytesDone, bytesTotal }) => {
  return (
    <Fragment>
      {bytesPercent}<br />
      {bytesDone} / {bytesTotal}
    </Fragment>
  );
};

export const TranslogProgress = ({ hasTranslog, translogPercent, translogDone, translogTotal }) => {
  return hasTranslog ? (
    <Fragment>
      {translogPercent}<br />
      {translogDone} / {translogTotal}
    </Fragment>
  ) : 'n/a';
};

