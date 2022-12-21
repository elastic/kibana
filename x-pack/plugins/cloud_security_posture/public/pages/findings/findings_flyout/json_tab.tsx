/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { XJsonLang } from '@kbn/monaco';
import { CspFinding } from '../../../../common/schemas/csp_finding';

const offsetHeight = 120;

export const JsonTab = ({ data }: { data: CspFinding }) => (
  <div style={{ position: 'absolute', inset: 0, top: offsetHeight }}>
    <CodeEditor
      isCopyable
      allowFullScreen
      languageId={XJsonLang.ID}
      value={JSON.stringify(data, null, 2)}
      options={{
        readOnly: true,
        lineNumbers: 'on',
        folding: true,
      }}
    />
  </div>
);
