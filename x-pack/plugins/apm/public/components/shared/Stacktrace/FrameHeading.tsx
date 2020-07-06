/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import styled from 'styled-components';
import { IStackframe } from '../../../../typings/es_schemas/raw/fields/stackframe';
import { fontFamilyCode, fontSize, px, units } from '../../../style/variables';

const FileDetails = styled.div`
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
  padding: ${px(units.half)} 0;
  font-family: ${fontFamilyCode};
  font-size: ${fontSize};
`;

const LibraryFrameFileDetail = styled.span`
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
`;

const AppFrameFileDetail = styled.span`
  color: ${({ theme }) => theme.eui.euiColorFullShade};
`;

interface Props {
  stackframe: IStackframe;
  isLibraryFrame: boolean;
}

const FrameHeading: React.FC<Props> = ({ stackframe, isLibraryFrame }) => {
  const FileDetail = isLibraryFrame
    ? LibraryFrameFileDetail
    : AppFrameFileDetail;
  const lineNumber = stackframe.line?.number ?? 0;

  const name =
    'filename' in stackframe ? stackframe.filename : stackframe.classname;

  return (
    <FileDetails>
      <FileDetail>{name}</FileDetail> in{' '}
      <FileDetail>{stackframe.function}</FileDetail>
      {lineNumber > 0 && (
        <Fragment>
          {' at '}
          <FileDetail>line {lineNumber}</FileDetail>
        </Fragment>
      )}
    </FileDetails>
  );
};

export { FrameHeading };
