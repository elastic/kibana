/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentType } from 'react';
import styled from 'styled-components';
import { Stackframe } from '../../../../typings/es_schemas/raw/fields/stackframe';
import { fontFamilyCode, fontSize, px, units } from '../../../style/variables';
import {
  CSharpFrameHeadingRenderer,
  DefaultFrameHeadingRenderer,
  FrameHeadingRendererProps,
  JavaFrameHeadingRenderer,
  JavaScriptFrameHeadingRenderer,
  RubyFrameHeadingRenderer,
} from './frame_heading_renderers';

const FileDetails = styled.div`
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
  line-height: 1.5; /* matches the line-hight of the accordion container button */
  padding: ${px(units.eighth)} 0;
  font-family: ${fontFamilyCode};
  font-size: ${fontSize};
`;

const LibraryFrameFileDetail = styled.span`
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
  word-break: break-word;
`;

const AppFrameFileDetail = styled.span`
  color: ${({ theme }) => theme.eui.euiColorFullShade};
  word-break: break-word;
`;

interface Props {
  codeLanguage?: string;
  stackframe: Stackframe;
  isLibraryFrame: boolean;
}

function FrameHeading({ codeLanguage, stackframe, isLibraryFrame }: Props) {
  const FileDetail: ComponentType = isLibraryFrame
    ? LibraryFrameFileDetail
    : AppFrameFileDetail;
  let Renderer: ComponentType<FrameHeadingRendererProps>;
  switch (codeLanguage?.toString().toLowerCase()) {
    case 'c#':
      Renderer = CSharpFrameHeadingRenderer;
      break;
    case 'java':
      Renderer = JavaFrameHeadingRenderer;
      break;
    case 'javascript':
      Renderer = JavaScriptFrameHeadingRenderer;
      break;
    case 'ruby':
      Renderer = RubyFrameHeadingRenderer;
      break;
    default:
      Renderer = DefaultFrameHeadingRenderer;
      break;
  }

  return (
    <FileDetails data-test-subj="FrameHeading">
      <Renderer fileDetailComponent={FileDetail} stackframe={stackframe} />
    </FileDetails>
  );
}

export { FrameHeading };
