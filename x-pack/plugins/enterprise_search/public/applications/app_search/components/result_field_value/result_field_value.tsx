/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import classNames from 'classnames';

import { Raw, Snippet } from '../../types';

import './result_field_value.scss';

const isNotNumeric = (raw: string | number): boolean => {
  if (typeof raw === 'number') return false;
  return isNaN(parseFloat(raw));
};

const getRawArrayDisplay = (rawArray: Array<string | number>): string => {
  return `[${rawArray.map((raw) => (isNotNumeric(raw) ? `"${raw}"` : raw)).join(', ')}]`;
};

const parseHighlights = (highlight: string): string => {
  return highlight.replace(
    /<em>(.+?)<\/em>/gi,
    '<em class="enterpriseSearchResultHighlight">$1</em>'
  );
};

const isFieldValueEmpty = (type?: string, raw?: Raw, snippet?: Snippet) => {
  const isNumber = type === 'number';
  if (isNumber) {
    return raw === null;
  }

  return !snippet && !raw;
};

interface Props {
  raw?: Raw;
  snippet?: Snippet;
  type?: string;
  className?: string;
}

export const ResultFieldValue: React.FC<Props> = ({ snippet, raw, type, className }) => {
  const isEmpty = isFieldValueEmpty(type, raw, snippet);
  if (isEmpty) return <>&mdash;</>;
  const classes = classNames({ [`enterpriseSearchDataType--${type}`]: !!type }, className);
  return (
    <div
      className={classes}
      /*
       * Justification for dangerouslySetInnerHTML:
       * The App Search server will return html highlights within fields. This data is sanitized by
       * the App Search server is considered safe for use.
       */
      dangerouslySetInnerHTML={snippet ? { __html: parseHighlights(snippet) } : undefined} // eslint-disable-line react/no-danger
    >
      {!!snippet ? null : Array.isArray(raw) ? getRawArrayDisplay(raw) : raw}
    </div>
  );
};
