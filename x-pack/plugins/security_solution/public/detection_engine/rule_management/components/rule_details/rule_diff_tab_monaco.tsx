/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { CodeEditorField } from '@kbn/kibana-react-plugin/public';
import { XJsonLang } from '@kbn/monaco';
import { EuiSpacer } from '@elastic/eui';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas.gen';
import { sortAndStringifyJson } from './json_diff/sort_stringify_json';

interface RuleDiffTabProps {
  oldRule: RuleResponse;
  newRule: RuleResponse;
}

export const RuleDiffTabMonaco = ({ oldRule, newRule }: RuleDiffTabProps) => {
  const [oldRuleString, newRuleString] = useMemo(() => {
    return [sortAndStringifyJson(oldRule), sortAndStringifyJson(newRule)];
  }, [oldRule, newRule]);

  return (
    <>
      <EuiSpacer size="m" />
      <CodeEditorField
        aria-label={''}
        languageId={XJsonLang.ID}
        original={oldRuleString}
        value={newRuleString}
        fullWidth={true}
        height="500px"
        options={{
          accessibilitySupport: 'off',
          fontSize: 12,
          tabSize: 2,
          automaticLayout: true,
          minimap: { enabled: false },
          overviewRulerBorder: false,
          scrollbar: { alwaysConsumeMouseWheel: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          readOnly: true,
          domReadOnly: true,
          renderSideBySide: true,
          useInlineViewWhenSpaceIsLimited: true,
          renderSideBySideInlineBreakpoint: 100,
          diffAlgorithm: 'advanced',
          lineNumbers: 'on',
        }}
      />
    </>
  );
};
