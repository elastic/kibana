/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Tls } from '../../../../../common/runtime_types';
import { CERTIFICATES_ROUTE } from '../../../../../common/constants';
import { MonListDescription, MonListTitle } from './status_bar';
import { CertStatusColumn } from '../../../overview/monitor_list/cert_status_column';

interface Props {
  /**
   * TLS information coming from monitor in ES heartbeat index
   */
  tls: Tls | undefined;
}

export const MonitorSSLCertificate = ({ tls }: Props) => {
  return tls?.not_after ? (
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
          <CertStatusColumn cert={tls} boldStyle={true} />
        </Link>
      </MonListDescription>
    </>
  ) : null;
};
