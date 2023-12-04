/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiStyled } from '@kbn/react-kibana-context-styled';
import React from 'react';

const FileDetails = euiStyled.div`
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
  line-height: 1.5; /* matches the line-hight of the accordion container button */
  padding: 2px 0;
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
`;

const LibraryFrameFileDetail = euiStyled.span`
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
  word-break: break-word;
`;

export function OtelHeadingRenderer({
  codeStackTrace,
}: {
  codeStackTrace: string;
}) {
  return (
    <FileDetails>
      <LibraryFrameFileDetail>{codeStackTrace}</LibraryFrameFileDetail>
    </FileDetails>
  );
}
