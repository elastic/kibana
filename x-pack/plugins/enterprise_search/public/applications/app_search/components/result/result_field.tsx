/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ResultFieldValue } from '.';
import { FieldType, Raw, Snippet } from './types';

import './result_field.scss';

interface Props {
  field: string;
  raw?: Raw;
  snippet?: Snippet;
  type?: FieldType;
}

export const ResultField: React.FC<Props> = ({ field, raw, snippet, type }) => {
  return (
    <div className="appSearchResultField">
      <div className="appSearchResultField__key eui-textTruncate">{field}</div>
      <div className="appSearchResultField__separator" aria-hidden />
      <div className="appSearchResultField__value">
        <ResultFieldValue className="eui-textTruncate" raw={raw} snippet={snippet} type={type} />
      </div>
    </div>
  );
};
