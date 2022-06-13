/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { truncate, truncateBeginning } from '.';

import './truncated_content.scss';

interface TruncatedContentProps {
  content: string;
  length: number;
  beginning?: boolean;
  tooltipType?: 'inline' | 'title';
}

export const TruncatedContent: React.FC<TruncatedContentProps> = ({
  content,
  length,
  beginning = false,
  tooltipType = 'inline',
}) => {
  if (content.length <= length) return <>{content}</>;

  const inline = tooltipType === 'inline';
  return (
    <span className="truncated-content" title={!inline ? content : ''}>
      {beginning ? truncateBeginning(content, length) : truncate(content, length)}
      {inline && <span className="truncated-content__tooltip">{content}</span>}
    </span>
  );
};
