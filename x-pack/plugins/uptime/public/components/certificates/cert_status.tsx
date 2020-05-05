/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiHealth } from '@elastic/eui';
import { Cert } from '../../../common/runtime_types';
import { useCertStatus } from '../../hooks';
import * as labels from './translations';
import { CERT_STATUS } from '../../../common/constants';

interface Props {
  cert: Cert;
}

export const CertStatus: React.FC<Props> = ({ cert }) => {
  const certStatus = useCertStatus(cert?.not_after, cert?.not_before);

  if (certStatus === CERT_STATUS.EXPIRING_SOON) {
    return (
      <EuiHealth color="warning">
        <span>{labels.EXPIRES_SOON}</span>
      </EuiHealth>
    );
  }
  if (certStatus === CERT_STATUS.EXPIRED) {
    return (
      <EuiHealth color="danger">
        <span>{labels.EXPIRED}</span>
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

  return (
    <EuiHealth color="success">
      <span>{labels.OK}</span>
    </EuiHealth>
  );
};
