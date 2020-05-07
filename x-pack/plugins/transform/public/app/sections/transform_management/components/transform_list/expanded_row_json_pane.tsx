/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import {
  // @ts-ignore
  EuiCodeEditor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

interface Props {
  json: object;
}

export const ExpandedRowJsonPane: FC<Props> = ({ json }) => {
  return (
    <div data-test-subj="transformJsonTabContent">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiCodeEditor
            value={JSON.stringify(json, null, 2)}
            readOnly={true}
            mode="json"
            style={{ width: '100%' }}
            theme="textmate"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>&nbsp;</EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
