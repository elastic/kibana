/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, ReactNode, memo, useMemo } from 'react';
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

import { OperatingSystem } from '../../../../../../common/endpoint/types';
import { OS_TITLES } from '../../../../common/translations';

const PolicyDetailCard = styled.div`
  .policyDetailTitleOS {
    flex-grow: 2;
  }
  .policyDetailTitleFlexItem {
    margin: 0;
  }
`;
export const ConfigForm: FC<{
  /**
   * A subtitle for this component.
   **/
  type: string;
  /**
   * Types of supported operating systems.
   */
  supportedOss: OperatingSystem[];
  children: React.ReactNode;
  dataTestSubj: string;
  /** React Node to be put on the right corner of the card */
  rightCorner: ReactNode;
}> = memo(({ type, supportedOss, children, dataTestSubj, rightCorner }) => {
  const typeTitle = useMemo(() => {
    return (
      <EuiFlexGroup direction="row" gutterSize="none" alignItems="center">
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem className="policyDetailTitleFlexItem">
            <EuiTitle size="xxxs">
              <h6>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policyDetailType"
                  defaultMessage="Type"
                />
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
                  id="xpack.securitySolution.endpoint.policyDetailOS"
                  defaultMessage="Operating System"
                />
              </h6>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem className="policyDetailTitleFlexItem">
            <EuiText>{supportedOss.map((os) => OS_TITLES[os]).join(', ')}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem grow={false}>{rightCorner}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [rightCorner, supportedOss, type]);

  return (
    <PolicyDetailCard>
      <EuiCard description data-test-subj={dataTestSubj} textAlign="left" title={typeTitle}>
        <EuiHorizontalRule margin="m" />
        {children}
      </EuiCard>
    </PolicyDetailCard>
  );
});

ConfigForm.displayName = 'ConfigForm';
