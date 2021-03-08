/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import styled from 'styled-components';
import { EuiIcon, EuiText, EuiToolTip } from '@elastic/eui';
import { X509Expiry } from '../../../../../common/runtime_types';
import { useCertStatus } from '../../../../hooks';
import { EXPIRED, EXPIRES, EXPIRES_SOON } from '../../../certificates/translations';
import { CERT_STATUS } from '../../../../../common/constants';

interface Props {
  expiry: X509Expiry;
  boldStyle?: boolean;
}

const Span = styled.span`
  margin-left: 5px;
  vertical-align: middle;
`;

const H4Text = styled.h4`
  &&& {
    margin: 0 0 0 4px;
    display: inline-block;
    color: inherit;
  }
`;

export const CertStatusColumn: React.FC<Props> = ({ expiry, boldStyle = false }) => {
  const notAfter = expiry?.not_after;
  const certStatus = useCertStatus(notAfter);

  const relativeDate = moment(notAfter).fromNow();

  const CertStatus = ({ color, text }: { color: string; text: string }) => {
    return (
      <EuiToolTip content={moment(notAfter).format('L LT')}>
        <EuiText size="s">
          <EuiIcon color={color} type="lock" size="s" />
          {boldStyle ? (
            <H4Text>
              {text} {relativeDate}
            </H4Text>
          ) : (
            <Span>
              {text} {relativeDate}
            </Span>
          )}
        </EuiText>
      </EuiToolTip>
    );
  };

  if (certStatus === CERT_STATUS.EXPIRING_SOON) {
    return <CertStatus color="warning" text={EXPIRES_SOON} />;
  }
  if (certStatus === CERT_STATUS.EXPIRED) {
    return <CertStatus color="danger" text={EXPIRED} />;
  }

  return certStatus ? <CertStatus color="success" text={EXPIRES} /> : <span>--</span>;
};
