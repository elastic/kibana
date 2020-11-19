/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPanel, EuiSpacer } from '@elastic/eui';

import { EuiLinkTo } from '../../../../../shared/react_router_helpers';

// TODO replace this with a real result type when we implement a more sophisticated
// ResultView
interface Result {
  [key: string]: {
    raw: string | string[] | number | number[] | undefined;
  };
}

interface Props {
  engineName: string;
  result: Result;
}

export const ResultView: React.FC<Props> = ({ engineName, result }) => {
  // TODO Replace this entire component when we migrate StuiResult
  return (
    <li>
      <EuiPanel>
        <EuiLinkTo to={`/engines/${engineName}/documents/${result.id.raw}`}>
          <strong>{result.id.raw}</strong>
        </EuiLinkTo>
        {Object.entries(result).map(([key, value]) => (
          <div key={key} style={{ wordBreak: 'break-all' }}>
            {key}: {value.raw}
          </div>
        ))}
      </EuiPanel>
      <EuiSpacer />
    </li>
  );
};
