/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FileJSON } from '../../../../common';
import { FileCard } from './file_card';

interface Props {
  files: FileJSON[];
}

export const FileGrid: FunctionComponent<Props> = ({ files }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(calc(${euiTheme.size.xxxxl} * 3.2), 1fr));
        gap: ${euiTheme.size.m};
      `}
    >
      {files.map((file) => (
        <FileCard file={file} />
      ))}
    </div>
  );
};
