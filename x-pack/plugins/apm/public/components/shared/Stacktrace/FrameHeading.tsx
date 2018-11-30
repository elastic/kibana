/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { colors, fontFamilyCode, px, units } from '../../../style/variables';

const FileDetails = styled.div`
  color: ${colors.gray3};
  padding: ${px(units.half)};
  font-family: ${fontFamilyCode};
`;
const LibraryFrameFileDetail = styled.span`
  color: ${colors.gray2};
`;
const AppFrameFileDetail = styled.span`
  font-weight: bold;
  color: ${colors.black};
`;

interface StackframeLine {
  number: number;
}

interface Stackframe {
  filename: string;
  function: string;
  line: StackframeLine;
}

interface Props {
  stackframe: Stackframe;
  isLibraryFrame?: boolean;
}

const FrameHeading: React.SFC<Props> = ({
  stackframe,
  isLibraryFrame = false
}) => {
  const FileDetail = isLibraryFrame
    ? LibraryFrameFileDetail
    : AppFrameFileDetail;
  return (
    <FileDetails>
      <FileDetail>{stackframe.filename}</FileDetail> in{' '}
      <FileDetail>{stackframe.function}</FileDetail> at{' '}
      <FileDetail>line {stackframe.line.number}</FileDetail>
    </FileDetails>
  );
};

export { FrameHeading };
