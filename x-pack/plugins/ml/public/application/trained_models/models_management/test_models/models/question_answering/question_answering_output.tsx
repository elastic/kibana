/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, ReactNode } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { EuiBadge } from '@elastic/eui';

import { useCurrentEuiTheme } from '../../../../../components/color_range_legend/use_color_range';

import type {
  QuestionAnsweringInference,
  FormattedQuestionAnsweringResult,
} from './question_answering_inference';

const ICON_PADDING = '2px';
const TRIM_CHAR_COUNT = 200;

export const getQuestionAnsweringOutputComponent = (inferrer: QuestionAnsweringInference) => (
  <QuestionAnsweringOutput inferrer={inferrer} />
);

const QuestionAnsweringOutput: FC<{ inferrer: QuestionAnsweringInference }> = ({ inferrer }) => {
  const result = useObservable(inferrer.inferenceResult$);
  if (!result || result.response.length === 0) {
    return null;
  }

  const bestResult = result.response[0];
  const { inputText } = result;

  return <>{insertHighlighting(bestResult, inputText)}</>;
};

function insertHighlighting(result: FormattedQuestionAnsweringResult, inputText: string) {
  const start = inputText.slice(0, result.startOffset);
  const end = inputText.slice(result.endOffset, inputText.length);
  const truncatedStart =
    start.length > TRIM_CHAR_COUNT
      ? `...${start.slice(start.length - TRIM_CHAR_COUNT, start.length)}`
      : start;
  const truncatedEnd = end.length > TRIM_CHAR_COUNT ? `${end.slice(0, TRIM_CHAR_COUNT)}...` : end;

  return (
    <div style={{ lineHeight: '24px' }}>
      {truncatedStart}
      <ResultBadge>{result.value}</ResultBadge>
      {truncatedEnd}
    </div>
  );
}

const ResultBadge = ({ children }: { children: ReactNode }) => {
  const { euiTheme } = useCurrentEuiTheme();
  return (
    <EuiBadge
      color={euiTheme.euiColorVis5_behindText}
      style={{
        marginRight: ICON_PADDING,
        marginTop: `-${ICON_PADDING}`,
        border: `1px solid ${euiTheme.euiColorVis5}`,
        fontSize: euiTheme.euiFontSizeXS,
        padding: '0px 6px',
        pointerEvents: 'none',
      }}
    >
      {children}
    </EuiBadge>
  );
};
