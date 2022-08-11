/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import classNames from 'classnames';

import { SchemaType } from '../../../shared/schema/types';

import { FieldType, Raw, SimpleFieldValue, Snippet } from './types';

import './result_field_value.scss';

const isNotNumeric = (raw: string | number): boolean => {
  if (typeof raw === 'number') return false;
  return isNaN(parseFloat(raw));
};

const isScalarValue = (_: Raw, type?: FieldType): _ is SimpleFieldValue => {
  return type !== SchemaType.Nested;
};

const getRawDisplay = (raw?: Raw, type?: FieldType): string | null => {
  if (!raw) {
    return null;
  }

  if (!isScalarValue(raw, type)) {
    return JSON.stringify(raw);
  }

  if (Array.isArray(raw)) {
    return getRawArrayDisplay(raw);
  }

  return raw.toString();
};

const getRawArrayDisplay = (rawArray: string[] | number[]): string => {
  return `[${rawArray.map((raw) => (isNotNumeric(raw) ? `"${raw}"` : raw)).join(', ')}]`;
};

const parseHighlights = (highlight: string): string => {
  return highlight.replace(/<em>(.+?)<\/em>/gi, '<mark class="euiMark">$1</mark>');
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
  type?: FieldType;
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
      {!!snippet ? null : getRawDisplay(raw, type)}
    </div>
  );
};
