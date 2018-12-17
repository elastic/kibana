/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { Stackframe } from 'x-pack/plugins/apm/typings/es_schemas/APMDoc';
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

interface LibraryStackFrameProps {
  codeLanguage?: string;
  stackframe: Stackframe;
}

const LibraryStackFrame: React.SFC<LibraryStackFrameProps> = ({
  codeLanguage,
  stackframe
}) => {
  return hasSourceLines(stackframe) ? (
    <CodePreview
      stackframe={stackframe}
      isLibraryFrame
      codeLanguage={codeLanguage}
    />
  ) : (
    <FrameHeading stackframe={stackframe} isLibraryFrame />
  );
};

interface Props {
  visible?: boolean;
  stackframes: Stackframe[];
  codeLanguage?: string;
  onClick: () => void;
}

export const LibraryStackFrames: React.SFC<Props> = ({
  visible,
  stackframes,
  codeLanguage,
  onClick
}) => {
  if (stackframes.length === 0) {
    return null;
  }

  if (stackframes.length === 1) {
    return (
      <LibraryStackFrame
        codeLanguage={codeLanguage}
        stackframe={stackframes[0]}
      />
    );
  }

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
          stackframes.map((stackframe, i) => (
            <LibraryStackFrame
              key={i}
              codeLanguage={codeLanguage}
              stackframe={stackframe}
            />
          ))}
      </div>
    </div>
  );
};
