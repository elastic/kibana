/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import * as Diff2Html from 'diff2html';
import { formatLines, diffLines } from 'unidiff';
import 'diff2html/bundles/css/diff2html.min.css';
import { EuiSpacer } from '@elastic/eui';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas.gen';
import { sortAndStringifyJson } from './json_diff/sort_stringify_json';

interface RuleDiffTabProps {
  oldRule: RuleResponse;
  newRule: RuleResponse;
}

export const RuleDiffTabDiff2Html = ({ oldRule, newRule }: RuleDiffTabProps) => {
  const diffHtml = useDiffHtml(oldRule, newRule);

  return (
    <>
      <EuiSpacer size="m" />
      <div id="code-diff" dangerouslySetInnerHTML={{ __html: diffHtml }} />
    </>
  );
};

const useDiffHtml = (oldRule: RuleResponse, newRule: RuleResponse): string => {
  const memoizedDiffHtml = useMemo(() => {
    const unifiedDiffString = formatLines(
      diffLines(sortAndStringifyJson(oldRule), sortAndStringifyJson(newRule)),
      { context: 3 }
    );

    return Diff2Html.html(unifiedDiffString, {
      inputFormat: 'json',
      drawFileList: false,
      fileListToggle: false,
      fileListStartVisible: false,
      fileContentToggle: false,
      matching: 'lines', // "lines" or "words"
      diffStyle: 'word', // "word" or "char"
      outputFormat: 'side-by-side',
      synchronisedScroll: true,
      highlight: true,
      renderNothingWhenEmpty: false,
    });
  }, [oldRule, newRule]);

  return memoizedDiffHtml;
};
