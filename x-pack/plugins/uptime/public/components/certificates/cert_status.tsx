/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import styled from 'styled-components';
import { EuiHealth, EuiText } from '@elastic/eui';
import { Cert } from '../../../common/runtime_types';
import { useCertStatus } from '../../hooks';
import * as labels from './translations';
import { CERT_STATUS } from '../../../common/constants';

interface Props {
  cert: Cert;
}

const DateText = styled(EuiText)`
  display: inline-block;
  margin-left: 5px;
`;

export const CertStatus: React.FC<Props> = ({ cert }) => {
  const certStatus = useCertStatus(cert?.not_after, cert?.not_before);

  const relativeDate = moment(cert?.not_after).fromNow();

  if (certStatus === CERT_STATUS.EXPIRING_SOON) {
    return (
      <EuiHealth color="warning">
        <span>
          {labels.EXPIRES_SOON}
          {'  '}
          <DateText color="subdued" size="xs">
            {relativeDate}
          </DateText>
        </span>
      </EuiHealth>
    );
  }
  if (certStatus === CERT_STATUS.EXPIRED) {
    return (
      <EuiHealth color="danger">
        <span>
          {labels.EXPIRED}
          {'  '}
          <DateText color="subdued" size="xs">
            {relativeDate}
          </DateText>
        </span>
      </EuiHealth>
    );
  }

  if (certStatus === CERT_STATUS.TOO_OLD) {
    return (
      <EuiHealth color="danger">
        <span>{labels.TOO_OLD}</span>
      </EuiHealth>
    );
  }

  const okRelativeDate = moment(cert?.not_after).fromNow(true);

  return (
    <EuiHealth color="success">
      <span>
        {labels.OK}
        {'  '}
        <DateText color="subdued" size="xs">
          {'for '}
          {okRelativeDate}
        </DateText>
      </span>
    </EuiHealth>
  );
};
