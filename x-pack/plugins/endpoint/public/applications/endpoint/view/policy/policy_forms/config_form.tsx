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
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';

const PolicyDetailCard = styled.div`
  .policyDetailTitleOS {
    flex-grow: 2;
  }
  .policyDetailTitleValue {
    font-size: 16px;
    font-weight: normal;
    line-height: normal;
  }
  .policyDetailTitleFlexItem {
    margin: 0;
  }
  .eventCollectionsEnabled {
    color: ${props => props.theme.eui.euiColorMediumShade};
    font-size: 14px;
    font-weight: normal;
  }
`;
export const ConfigForm: React.FC<{
  type: string;
  supportedOss: string[];
  children: React.ReactNode;
  id: string;
}> = React.memo(({ type, supportedOss, children, id }) => {
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
            <p className="policyDetailTitleValue">{type}</p>
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
            <p className="policyDetailTitleValue">{supportedOss.join(', ')}</p>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <p className="eventCollectionsEnabled">#/# event collections enabled</p>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const events = () => {
    return (
      <EuiTitle size="xxs">
        <h5>
          <FormattedMessage
            id="xpack.endpoint.policyDetailsConfig.eventingEvents"
            defaultMessage="Events"
          />
        </h5>
      </EuiTitle>
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
            {events()}
            <EuiSpacer size="s" />
            {children}
          </>
        }
      />
    </PolicyDetailCard>
  );
});
