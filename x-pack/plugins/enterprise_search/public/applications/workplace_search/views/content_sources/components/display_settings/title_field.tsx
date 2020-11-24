/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import classNames from 'classnames';

import { IObject } from 'workplace_search/types';

interface TitleFieldProps {
  result: IObject;
  titleField: string | null;
  titleFieldHover: boolean;
}

export const TitleField: React.FC<TitleFieldProps> = ({ result, titleField, titleFieldHover }) => {
  const title = titleField ? result[titleField] : '';
  const titleDisplay = Array.isArray(title) ? title.join(', ') : title;
  return (
    <div
      className={classNames('example-result-content__title', {
        'example-result-field-hover': titleFieldHover,
      })}
    >
      {titleField ? (
        <div className="eui-textTruncate">{titleDisplay}</div>
      ) : (
        <span className="example-result-content-placeholder">Title</span>
      )}
    </div>
  );
};
