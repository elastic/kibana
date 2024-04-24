/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FrameHeadingRendererProps } from '.';

export function DefaultFrameHeadingRenderer({
  stackframe,
  fileDetailComponent: FileDetail,
}: FrameHeadingRendererProps) {
  const lineNumber = stackframe.line?.number ?? 0;

  const name = 'filename' in stackframe ? stackframe.filename : stackframe.classname;

  return (
    <>
      <FileDetail>{name}</FileDetail>{' '}
      {i18n.translate('xpack.apm.defaultFrameHeadingRenderer.inLabel', { defaultMessage: 'in' })}
      <FileDetail>{stackframe.function}</FileDetail>
      {lineNumber > 0 && (
        <>
          {' at '}
          <FileDetail>
            {i18n.translate('xpack.apm.defaultFrameHeadingRenderer.fileDetail.lineLabel', {
              defaultMessage: 'line',
            })}
            {lineNumber}
          </FileDetail>
        </>
      )}
    </>
  );
}
