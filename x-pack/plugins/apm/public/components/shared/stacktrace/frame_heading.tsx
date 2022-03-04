/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { Stackframe } from '../../../../typings/es_schemas/raw/fields/stackframe';
import {
  CSharpFrameHeadingRenderer,
  DefaultFrameHeadingRenderer,
  FrameHeadingRendererProps,
  JavaFrameHeadingRenderer,
  JavaScriptFrameHeadingRenderer,
  RubyFrameHeadingRenderer,
} from './frame_heading_renderers';

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

const AppFrameFileDetail = euiStyled.span`
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
