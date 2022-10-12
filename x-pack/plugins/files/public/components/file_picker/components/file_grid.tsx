/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent } from 'react';
import { useEuiTheme, EuiEmptyPrompt } from '@elastic/eui';
import { css } from '@emotion/react';

import { useBehaviorSubject } from '../../use_behavior_subject';
import { i18nTexts } from '../i18n_texts';
import { useFilePickerContext } from '../context';
import { FileCard } from './file_card';

export const FileGrid: FunctionComponent = () => {
  const { state } = useFilePickerContext();
  const { euiTheme } = useEuiTheme();
  const files = useBehaviorSubject(state.files$);
  if (!files.length) {
    return <EuiEmptyPrompt title={<h3>{i18nTexts.emptyFileGridPrompt}</h3>} titleSize="s" />;
  }
  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(calc(${euiTheme.size.xxxxl} * 2.5), 1fr));
        gap: ${euiTheme.size.m};
      `}
    >
      {files.map((file) => (
        <FileCard file={file} />
      ))}
    </div>
  );
};
