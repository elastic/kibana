/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { EuiForm, EuiPanel, EuiSpacer } from '@elastic/eui';

import { AggName } from '../../../../../../common/types/aggregations';

import { PivotAggsConfigDict } from '../../../../common';

export interface AggListSummaryProps {
  list: PivotAggsConfigDict;
}

export const AggListSummary: React.FC<AggListSummaryProps> = ({ list }) => {
  const aggIds = Object.keys(list);
  return (
    <EuiForm>
      {aggIds.map((aggId: AggName) => (
        <Fragment key={aggId}>
          <EuiPanel paddingSize="s">
            <div className="eui-textTruncate">{list[aggId].aggName}</div>
          </EuiPanel>
          {aggIds.length > 0 && <EuiSpacer size="s" />}
        </Fragment>
      ))}
    </EuiForm>
  );
};
