/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiHorizontalRule,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';

const PolicyDetailCard = styled.div`
  .policyDetailTitleOS {
    flex-grow: 2;
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
  /** Takes a react component to be put on the right corner of the card */
  rightCorner: React.ReactNode;
}> = React.memo(({ type, supportedOss, children, id, rightCorner }) => {
  const typeTitle = () => {
    return (
      <EuiFlexGroup direction="row" gutterSize="none" alignItems="center">
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem className="policyDetailTitleFlexItem">
            <EuiTitle size="xxxs">
              <h6>
                <FormattedMessage id="xpack.endpoint.policyDetailType" defaultMessage="Type" />
              </h6>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem className="policyDetailTitleFlexItem">
            <EuiText size="m">{type}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup direction="column" gutterSize="none" className="policyDetailTitleOS">
          <EuiFlexItem className="policyDetailTitleFlexItem">
            <EuiTitle size="xxxs">
              <h6>
                <FormattedMessage
                  id="xpack.endpoint.policyDetailOS"
                  defaultMessage="Operating System"
                />
              </h6>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem className="policyDetailTitleFlexItem">
            <EuiText>{supportedOss.join(', ')}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem grow={false}>{rightCorner}</EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <PolicyDetailCard>
      <EuiCard
        data-test-subj={id}
        textAlign="left"
        title={typeTitle()}
        description=""
        children={
          <>
            <EuiHorizontalRule margin="m" />
            {children}
          </>
        }
      />
    </PolicyDetailCard>
  );
});
