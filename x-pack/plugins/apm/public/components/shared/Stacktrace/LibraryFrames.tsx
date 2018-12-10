/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { Stackframe } from '../../../../typings/APMDoc';
import { px, units } from '../../../style/variables';
import { CodePreview } from '../../shared/CodePreview';
// @ts-ignore
import { Ellipsis } from '../../shared/Icons';
import { FrameHeading } from './FrameHeading';
import { hasSourceLines } from './stacktraceUtils';

const LibraryFrameToggle = styled.div`
  margin: 0 0 ${px(units.plus)} 0;
  user-select: none;
`;

interface Props {
  visible?: boolean;
  stackframes: Stackframe[];
  codeLanguage?: string;
  onClick: () => void;
}

export const LibraryFrames: React.SFC<Props> = ({
  visible,
  stackframes,
  codeLanguage,
  onClick
}) => {
  return (
    <div>
      <LibraryFrameToggle>
        <EuiLink onClick={onClick}>
          <Ellipsis horizontal={visible} style={{ marginRight: units.half }} />{' '}
          {stackframes.length} library frames
        </EuiLink>
      </LibraryFrameToggle>

      <div>
        {visible &&
          stackframes.map((stackframe, i) =>
            hasSourceLines(stackframe) ? (
              <CodePreview
                key={i}
                stackframe={stackframe}
                isLibraryFrame
                codeLanguage={codeLanguage}
              />
            ) : (
              <FrameHeading key={i} stackframe={stackframe} isLibraryFrame />
            )
          )}
      </div>
    </div>
  );
};
