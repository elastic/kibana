/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiForm, EuiPanel, EuiSpacer } from '@elastic/eui';

import { AggName, PivotAggsConfigDict } from '../../common';

export interface AggListSummaryProps {
  list: PivotAggsConfigDict;
}

export const AggListSummary: React.SFC<AggListSummaryProps> = ({ list }) => {
  const aggNames = Object.keys(list);
  return (
    <EuiForm>
      {aggNames.map((aggName: AggName) => (
        <Fragment key={aggName}>
          <EuiPanel paddingSize="s">
            <div className="eui-textTruncate">{aggName}</div>
          </EuiPanel>
          {aggNames.length > 0 && <EuiSpacer size="s" />}
        </Fragment>
      ))}
    </EuiForm>
  );
};
