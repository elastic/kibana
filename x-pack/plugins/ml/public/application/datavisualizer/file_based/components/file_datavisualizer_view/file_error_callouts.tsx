/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';

import { EuiCallOut, EuiSpacer, EuiButtonEmpty, EuiHorizontalRule } from '@elastic/eui';

import numeral from '@elastic/numeral';
import { ErrorResponse } from '../../../../../../common/types/errors';
import { FILE_SIZE_DISPLAY_FORMAT } from '../../../../../../../file_upload/common';

interface FileTooLargeProps {
  fileSize: number;
  maxFileSize: number;
}

export const FileTooLarge: FC<FileTooLargeProps> = ({ fileSize, maxFileSize }) => {
  const fileSizeFormatted = numeral(fileSize).format(FILE_SIZE_DISPLAY_FORMAT);
  const maxFileSizeFormatted = numeral(maxFileSize).format(FILE_SIZE_DISPLAY_FORMAT);

  // Format the byte values, using the second format if the difference between
  // the file size and the max is so small that the formatted values are identical
  // e.g. 100.01 MB and 100.0 MB
  let errorText;
  if (fileSizeFormatted !== maxFileSizeFormatted) {
    errorText = (
      <p>
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.fileErrorCallouts.fileSizeExceedsAllowedSizeErrorMessage"
          defaultMessage="The size of the file you selected for upload is {fileSizeFormatted} which
          exceeds the maximum permitted size of {maxFileSizeFormatted}"
          values={{
            fileSizeFormatted,
            maxFileSizeFormatted,
          }}
        />
      </p>
    );
  } else {
    const diffFormatted = numeral(fileSize - maxFileSize).format(FILE_SIZE_DISPLAY_FORMAT);
    errorText = (
      <p>
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.fileErrorCallouts.fileSizeExceedsAllowedSizeByDiffFormatErrorMessage"
          defaultMessage="The size of the file you selected for upload exceeds the maximum
          permitted size of {maxFileSizeFormatted} by {diffFormatted}"
          values={{
            maxFileSizeFormatted,
            diffFormatted,
          }}
        />
      </p>
    );
  }

  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.fileErrorCallouts.fileSizeTooLargeTitle"
          defaultMessage="File size is too large"
        />
      }
      color="danger"
      iconType="cross"
      data-test-subj="mlFileUploadErrorCallout fileTooLarge"
    >
      {errorText}
    </EuiCallOut>
  );
};

interface FileCouldNotBeReadProps {
  error: ErrorResponse;
  loaded: boolean;
  showEditFlyout(): void;
}

export const FileCouldNotBeRead: FC<FileCouldNotBeReadProps> = ({
  error,
  loaded,
  showEditFlyout,
}) => {
  const message = error?.body?.message || '';
  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.fileErrorCallouts.fileCouldNotBeReadTitle"
            defaultMessage="File structure cannot be determined"
          />
        }
        color="danger"
        iconType="cross"
        data-test-subj="mlFileUploadErrorCallout fileCouldNotBeRead"
      >
        {loaded === false && (
          <>
            <FormattedMessage
              id="xpack.ml.fileDatavisualizer.fileErrorCallouts.applyOverridesDescription"
              defaultMessage="If you know something about this data, such as the file format or timestamp format, adding initial overrides may help us to infer the rest of the structure."
            />
            <br />
            <EuiButtonEmpty onClick={showEditFlyout} flush="left" size="xs">
              <FormattedMessage
                id="xpack.ml.fileDatavisualizer.fileErrorCallouts.overrideButton"
                defaultMessage="Apply override settings"
              />
            </EuiButtonEmpty>
            <EuiHorizontalRule />
          </>
        )}
        {message}
        <Explanation error={error} />
        {loaded && (
          <>
            <EuiSpacer size="s" />
            <FormattedMessage
              id="xpack.ml.fileDatavisualizer.fileErrorCallouts.revertingToPreviousSettingsDescription"
              defaultMessage="Reverting to previous settings"
            />
          </>
        )}
      </EuiCallOut>
    </>
  );
};

export const Explanation: FC<{ error: ErrorResponse }> = ({ error }) => {
  if (!error?.body?.attributes?.body?.error?.suppressed?.length) {
    return null;
  }
  const reason: string = error.body.attributes.body.error.suppressed[0].reason;
  return (
    <>
      <EuiSpacer size="s" />
      {reason.split('\n').map((m, i) => (
        <div key={i}>{m}</div>
      ))}
    </>
  );
};
