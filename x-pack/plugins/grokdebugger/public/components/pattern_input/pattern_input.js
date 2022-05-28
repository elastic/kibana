/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { EDITOR } from '../../../common/constants';
import { EuiCodeEditor } from '../../shared_imports';
import { GrokMode } from '../../lib/ace';

export function PatternInput({ value, onChange }) {
  return (
    <EuiFormRow
      label={
        <FormattedMessage id="xpack.grokDebugger.grokPatternLabel" defaultMessage="Grok Pattern" />
      }
      fullWidth
      data-test-subj="acePatternInput"
    >
      <EuiCodeEditor
        width="100%"
        theme="textmate"
        value={value}
        onChange={onChange}
        mode={new GrokMode()}
        setOptions={{
          highlightActiveLine: false,
          highlightGutterLine: false,
          minLines: EDITOR.PATTERN_MIN_LINES,
          maxLines: EDITOR.PATTERN_MAX_LINES,
        }}
      />
    </EuiFormRow>
  );
}
