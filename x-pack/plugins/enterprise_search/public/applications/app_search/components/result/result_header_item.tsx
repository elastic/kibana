/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import './result_header_item.scss';

import { TruncatedContent } from '../../../shared/truncate';

interface Props {
  field: string;
  value?: string | number;
  type: 'id' | 'score' | 'string';
}

const MAX_CHARACTER_LENGTH = 30;

export const ResultHeaderItem: React.FC<Props> = ({ field, type, value }) => {
  let formattedValue = '-';
  if (typeof value === 'string') {
    formattedValue = value;
  } else if (typeof value === 'number') {
    formattedValue = parseFloat((value as number).toFixed(2)).toString();
  }

  return (
    <div className="appSearchResultHeaderItem">
      <div className="appSearchResultHeaderItem__key">
        <TruncatedContent content={field} length={MAX_CHARACTER_LENGTH} tooltipType="title" />
      </div>
      <div className="appSearchResultHeaderItem__value">
        <TruncatedContent
          content={formattedValue}
          length={MAX_CHARACTER_LENGTH}
          tooltipType="title"
          beginning={type === 'id'}
        />
      </div>
    </div>
  );
};
