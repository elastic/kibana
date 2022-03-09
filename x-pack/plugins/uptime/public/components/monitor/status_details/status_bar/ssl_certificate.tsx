/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Tls, X509Expiry } from '../../../../../common/runtime_types';
import { CERTIFICATES_ROUTE } from '../../../../../common/constants';
import { MonListDescription, MonListTitle } from './status_bar';
import { CertStatusColumn } from '../../../overview/monitor_list/columns/cert_status_column';

interface Props {
  /**
   * TLS information coming from monitor in ES heartbeat index
   */
  tls: Tls | undefined;
}

export const MonitorSSLCertificate = ({ tls }: Props) => {
  let expiry: X509Expiry | null = null;
  if (tls?.server?.x509) {
    expiry = tls.server.x509;
  } else if (tls?.certificate_not_valid_after && tls?.certificate_not_valid_before) {
    expiry = {
      not_after: tls.certificate_not_valid_after,
      not_before: tls.certificate_not_valid_before,
    };
  }

  if (!expiry) {
    return null;
  }

  return (
    <>
      <MonListTitle>
        <FormattedMessage
          id="xpack.uptime.monitorStatusBar.sslCertificate.title"
          defaultMessage="TLS Certificate"
        />
      </MonListTitle>

      <EuiSpacer size="s" />
      <MonListDescription>
        <Link to={CERTIFICATES_ROUTE} className="eui-displayInline">
          <CertStatusColumn expiry={expiry} boldStyle={true} />
        </Link>
      </MonListDescription>
    </>
  );
};
