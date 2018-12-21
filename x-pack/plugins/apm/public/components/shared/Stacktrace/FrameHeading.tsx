/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { get } from 'lodash';
import React from 'react';
import styled from 'styled-components';
import { IStackframe } from '../../../../typings/es_schemas/Stackframe';
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
  const lineNumber: number = get(stackframe, 'line.number');
  return (
    <FileDetails>
      <FormattedMessage
        id="xpack.apm.stacktraceTab.exceptionLocationMessage"
        defaultMessage="{fileName} in {functionName} {atLineNumber}"
        values={{
          fileName: <FileDetail>{stackframe.filename}</FileDetail>,
          functionName: <FileDetail>{stackframe.function}</FileDetail>,
          atLineNumber:
            lineNumber > 0 ? (
              <FormattedMessage
                id="xpack.apm.stacktraceTab.exceptionLocationMessage.atLineNumberText"
                defaultMessage="at {lineNumber}"
                description="Part of composite text: xpack.apm.stacktraceTab.exceptionLocationMessage
                  + xpack.apm.stacktraceTab.exceptionLocationMessage.atLineNumberText
                  + xpack.apm.stacktraceTab.exceptionLocationMessage.lineNumberText"
                values={{
                  lineNumber: (
                    <FileDetail>
                      <FormattedMessage
                        id="xpack.apm.stacktraceTab.exceptionLocationMessage.lineNumberText"
                        defaultMessage="line {stackframeLineNumber}"
                        values={{
                          stackframeLineNumber: stackframe.line.number
                        }}
                        description="Part of composite text: xpack.apm.stacktraceTab.exceptionLocationMessage
                          + xpack.apm.stacktraceTab.exceptionLocationMessage.atLineNumberText
                          + xpack.apm.stacktraceTab.exceptionLocationMessage.lineNumberText"
                      />
                    </FileDetail>
                  )
                }}
              />
            ) : (
              ''
            )
        }}
      />
    </FileDetails>
  );
};

export { FrameHeading };
