/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import styled from 'styled-components';
import { EuiHealth, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSelector } from 'react-redux';
import { Cert } from '../../../common/runtime_types';
import { useCertStatus } from '../../hooks';
import * as labels from './translations';
import { CERT_STATUS } from '../../../common/constants';
import { selectDynamicSettings } from '../../state/selectors';

interface Props {
  cert: Cert;
}

const DateText = styled(EuiText)`
  display: inline-block;
  margin-left: 5px;
`;

export const CertStatus: React.FC<Props> = ({ cert }) => {
  const certStatus = useCertStatus(cert?.not_after, cert?.not_before);

  const dss = useSelector(selectDynamicSettings);

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
    const ageThreshold = dss.settings?.certAgeThreshold;

    const oldRelativeDate = moment(cert?.not_before).add(ageThreshold, 'days').fromNow();

    return (
      <EuiHealth color="danger">
        <span>
          {labels.TOO_OLD}
          <DateText color="subdued" size="xs">
            {oldRelativeDate}
          </DateText>
        </span>
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
          <FormattedMessage
            id="xpack.uptime.certs.status.ok.label"
            defaultMessage=" for {okRelativeDate}"
            description='Denotes an amount of time for which a cert is valid. Example: "OK for 2 days"'
            values={{
              okRelativeDate,
            }}
          />
        </DateText>
      </span>
    </EuiHealth>
  );
};
