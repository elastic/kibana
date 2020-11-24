/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import classNames from 'classnames';

import { IObject } from 'workplace_search/types';

interface SubtitleFieldProps {
  result: IObject;
  subtitleField: string | null;
  subtitleFieldHover: boolean;
}

export const SubtitleField: React.FC<SubtitleFieldProps> = ({
  result,
  subtitleField,
  subtitleFieldHover,
}) => (
  <div
    className={classNames('example-result-content__subtitle', {
      'example-result-field-hover': subtitleFieldHover,
    })}
  >
    {subtitleField ? (
      <div className="eui-textTruncate">{result[subtitleField]}</div>
    ) : (
      <span className="example-result-content-placeholder">Subtitle</span>
    )}
  </div>
);
