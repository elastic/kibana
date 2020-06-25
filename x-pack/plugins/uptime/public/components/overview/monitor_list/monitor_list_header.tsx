/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { StatusFilter } from './status_filter';
import { CERTIFICATES_ROUTE } from '../../../../common/constants';

const TitleStyle = styled(EuiTitle)`
  margin-left: auto;
`;

const FlexGroupContainer = styled(EuiFlexGroup)`
  && {
    @media only screen and (max-width: 768px) {
      > :first-child {
        flex-basis: 40% !important;
      }
      > :nth-child(2) {
        order: 3;
      }
      > :nth-child(3) {
        flex-basis: 60% !important;
      }
    }
  }
`;

export const MonitorListHeader: React.FC = () => {
  return (
    <FlexGroupContainer alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.uptime.monitorList.monitoringStatusTitle"
              defaultMessage="Monitors"
            />
          </h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <StatusFilter />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <TitleStyle size="xs">
          <h5>
            <Link to={CERTIFICATES_ROUTE} data-test-subj="uptimeCertificatesLink">
              <FormattedMessage
                id="xpack.uptime.monitorList.viewCertificateTitle"
                defaultMessage="Certificates status"
              />
            </Link>
          </h5>
        </TitleStyle>
      </EuiFlexItem>
    </FlexGroupContainer>
  );
};
