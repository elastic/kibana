/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiCodeEditor, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

interface Props {
  json: object;
  dataTestSubj: string;
}

export const ExpandedRowJsonPane: FC<Props> = ({ json, dataTestSubj }) => {
  return (
    <EuiFlexGroup data-test-subj={dataTestSubj}>
      <EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiCodeEditor
          value={JSON.stringify(json, null, 2)}
          readOnly={true}
          mode="json"
          style={{ width: '100%' }}
          theme="textmate"
          data-test-subj={`mlAnalyticsDetailsJsonPreview`}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>&nbsp;</EuiFlexItem>
    </EuiFlexGroup>
  );
};
