/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import styled from 'styled-components';
import { idx } from 'x-pack/plugins/apm/common/idx';
import { IStackframe } from 'x-pack/plugins/apm/typings/es_schemas/fields/Stackframe';
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

interface Props {
  stackframe: IStackframe;
  isLibraryFrame: boolean;
}

const FrameHeading: React.SFC<Props> = ({ stackframe, isLibraryFrame }) => {
  const FileDetail = isLibraryFrame
    ? LibraryFrameFileDetail
    : AppFrameFileDetail;
  const lineNumber = idx(stackframe, _ => _.line.number) || 0;
  return (
    <FileDetails>
      <FileDetail>{stackframe.filename}</FileDetail> in{' '}
      <FileDetail>{stackframe.function}</FileDetail>
      {lineNumber > 0 && (
        <Fragment>
          {' at '}
          <FileDetail>line {stackframe.line.number}</FileDetail>
        </Fragment>
      )}
    </FileDetails>
  );
};

export { FrameHeading };
