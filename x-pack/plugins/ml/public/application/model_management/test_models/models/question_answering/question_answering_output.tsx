/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiBadge, EuiHorizontalRule } from '@elastic/eui';
import { useCurrentThemeVars } from '../../../../contexts/kibana';
import type {
  FormattedQuestionAnsweringResult,
  QuestionAnsweringInference,
} from './question_answering_inference';

const ICON_PADDING = '2px';
const TRIM_CHAR_COUNT = 200;

export const getQuestionAnsweringOutputComponent = (inferrer: QuestionAnsweringInference) => (
  <QuestionAnsweringOutput inferrer={inferrer} />
);

const QuestionAnsweringOutput: FC<{ inferrer: QuestionAnsweringInference }> = ({ inferrer }) => {
  const result = useObservable(inferrer.getInferenceResult$(), inferrer.getInferenceResult());
  if (!result) {
    return null;
  }

  return (
    <>
      {result.map(({ response, inputText }) => (
        <>
          <>{insertHighlighting(response[0], inputText)}</>
          <EuiHorizontalRule />
        </>
      ))}
    </>
  );
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
  const { euiTheme } = useCurrentThemeVars();
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
