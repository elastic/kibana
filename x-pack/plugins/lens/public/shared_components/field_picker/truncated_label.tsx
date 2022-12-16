/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiMark } from '@elastic/eui';
import { EuiHighlight } from '@elastic/eui';

const createContext = () =>
  document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;

// extracted from getTextWidth for performance
const context = createContext();

const getTextWidth = (text: string, font: string) => {
  const ctx = context ?? createContext();
  ctx.font = font;
  const metrics = ctx.measureText(text);
  return metrics.width;
};

const truncateLabel = (
  width: number,
  font: string,
  label: string,
  approximateLength: number,
  labelFn: (label: string, length: number) => string
) => {
  let output = labelFn(label, approximateLength);
  while (getTextWidth(output, font) > width) {
    approximateLength = approximateLength - 1;
    output = labelFn(label, approximateLength);
  }
  return output;
};

export const TruncatedLabel = React.memo(function TruncatedLabel({
  label,
  width,
  search,
  font,
}: {
  label: string;
  search: string;
  width: number;
  font: string;
}) {
  const textWidth = useMemo(() => getTextWidth(label, font), [label, font]);

  if (textWidth < width) {
    return <EuiHighlight search={search}>{label}</EuiHighlight>;
  }

  const searchPosition = label.indexOf(search);
  const approximateLen = Math.round((width * label.length) / textWidth);
  const separator = `…`;
  let separatorsLength = separator.length;
  let labelFn;

  if (!search || searchPosition === -1) {
    labelFn = (text: string, length: number) =>
      `${text.substr(0, 8)}${separator}${text.substr(text.length - (length - 8))}`;
  } else if (searchPosition === 0) {
    // search phrase at the beginning
    labelFn = (text: string, length: number) => `${text.substr(0, length)}${separator}`;
  } else if (approximateLen > label.length - searchPosition) {
    // search phrase close to the end or at the end
    labelFn = (text: string, length: number) => `${separator}${text.substr(text.length - length)}`;
  } else {
    // search phrase is in the middle
    labelFn = (text: string, length: number) =>
      `${separator}${text.substr(searchPosition, length)}${separator}`;
    separatorsLength = 2 * separator.length;
  }

  const outputLabel = truncateLabel(width, font, label, approximateLen, labelFn);

  return search.length < outputLabel.length - separatorsLength ? (
    <EuiHighlight search={search}>{outputLabel}</EuiHighlight>
  ) : (
    <EuiMark>{outputLabel}</EuiMark>
  );
});
