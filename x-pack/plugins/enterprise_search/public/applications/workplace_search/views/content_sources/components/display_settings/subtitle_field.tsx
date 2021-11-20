/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import classNames from 'classnames';

import { Result } from '../../../../types';

import { SUBTITLE_LABEL } from './constants';

interface SubtitleFieldProps {
  result: Result;
  subtitleField: string | null;
  subtitleFieldHover: boolean;
}

export const SubtitleField: React.FC<SubtitleFieldProps> = ({
  result,
  subtitleField,
  subtitleFieldHover,
}) => (
  <div
    data-test-subj="SubtitleField"
    className={classNames('example-result-content__subtitle', {
      'example-result-field-hover': subtitleFieldHover,
    })}
  >
    {subtitleField ? (
      <div className="eui-textTruncate">{result[subtitleField]}</div>
    ) : (
      <span data-test-subj="DefaultSubtitleLabel" className="example-result-content-placeholder">
        {SUBTITLE_LABEL}
      </span>
    )}
  </div>
);
