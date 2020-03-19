/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiHorizontalRule } from '@elastic/eui';
import styled from 'styled-components';

const PolicyDetailCard = styled.div`
  .policyDetailTitleValue {
    font-size: 16px;
    font-weight: normal;
    line-height: normal;
  }
  .policyDetailTitleFlexItem {
    margin: 0;
  }
`;
export const ConfigForm: React.FC<{
  type: string;
  supportedOss: string[];
  children: React.ReactNode;
  id: string;
}> = React.memo(({ type, supportedOss, children, id }) => {
  const typeTitle = (
    <EuiFlexGroup direction="row" gutterSize="none" alignItems="flexStart">
      <EuiFlexGroup direction="column" gutterSize="none" className="policyDetailTitleSection">
        <EuiFlexItem className="policyDetailTitleFlexItem">
          <EuiTitle size="xxxs">
            <h6>Type</h6>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem className="policyDetailTitleFlexItem">
          <p className="policyDetailTitleValue">{type}</p>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup direction="column" gutterSize="none" className="policyDetailTitleSection">
        <EuiFlexItem className="policyDetailTitleFlexItem">
          <EuiTitle size="xxxs">
            <h6>Operating System</h6>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem className="policyDetailTitleFlexItem">
          <p className="policyDetailTitleValue">{supportedOss.join()}</p>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );

  return (
    <PolicyDetailCard>
      <EuiCard
        data-test-subj={id}
        textAlign="left"
        title={typeTitle}
        description={<EuiHorizontalRule />}
        children={children}
      />
    </PolicyDetailCard>
  );
});
