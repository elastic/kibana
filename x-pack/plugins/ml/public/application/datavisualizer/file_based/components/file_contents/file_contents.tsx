/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';

import { EuiTitle, EuiSpacer } from '@elastic/eui';

import { MLJobEditor, ML_EDITOR_MODE } from '../../../../jobs/jobs_list/components/ml_job_editor';

interface Props {
  data: string;
  format: string;
  numberOfLines: number;
}

export const FileContents: FC<Props> = ({ data, format, numberOfLines }) => {
  let mode = ML_EDITOR_MODE.TEXT;
  if (format === ML_EDITOR_MODE.JSON) {
    mode = ML_EDITOR_MODE.JSON;
  }

  const formattedData = limitByNumberOfLines(data, numberOfLines);

  return (
    <React.Fragment>
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.fileContents.fileContentsTitle"
            defaultMessage="File contents"
          />
        </h2>
      </EuiTitle>

      <div>
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.fileContents.firstLinesDescription"
          defaultMessage="First {numberOfLines, plural, zero {# line} one {# line} other {# lines}}"
          values={{
            numberOfLines,
          }}
        />
      </div>

      <EuiSpacer size="s" />

      <MLJobEditor
        mode={mode}
        readOnly={true}
        value={formattedData}
        height="200px"
        syntaxChecking={false}
      />
    </React.Fragment>
  );
};

function limitByNumberOfLines(data: string, numberOfLines: number) {
  return data.split('\n').slice(0, numberOfLines).join('\n');
}
