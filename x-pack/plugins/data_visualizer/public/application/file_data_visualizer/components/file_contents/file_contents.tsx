/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';

import { EuiTitle, EuiSpacer } from '@elastic/eui';

import { JsonEditor, EDITOR_MODE } from '../json_editor';

interface Props {
  data: string;
  format: string;
  numberOfLines: number;
}

export const FileContents: FC<Props> = ({ data, format, numberOfLines }) => {
  let mode = EDITOR_MODE.TEXT;
  if (format === EDITOR_MODE.JSON) {
    mode = EDITOR_MODE.JSON;
  }

  const formattedData = limitByNumberOfLines(data, numberOfLines);

  return (
    <React.Fragment>
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.dataVisualizer.file.fileContents.fileContentsTitle"
            defaultMessage="File contents"
          />
        </h2>
      </EuiTitle>

      <div>
        <FormattedMessage
          id="xpack.dataVisualizer.file.fileContents.firstLinesDescription"
          defaultMessage="First {numberOfLines, plural, zero {# line} one {# line} other {# lines}}"
          values={{
            numberOfLines,
          }}
        />
      </div>

      <EuiSpacer size="s" />

      <JsonEditor
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
