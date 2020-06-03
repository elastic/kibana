/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Link } from 'react-router-dom';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Tls } from '../../../../../common/runtime_types';
import { useCertStatus } from '../../../../hooks';
import { CERTIFICATES_ROUTE } from '../../../../../common/constants';
import { MonListDescription, MonListTitle } from './status_bar';
import { CertStatusColumn } from '../../../overview/monitor_list/cert_status_column';

interface Props {
  /**
   * TLS information coming from monitor in ES heartbeat index
   */
  tls: Tls | null | undefined;
}

export const MonitorSSLCertificate = ({ tls }: Props) => {
  const certStatus = useCertStatus(tls?.not_after);

  return certStatus ? (
    <>
      <MonListTitle>
        {i18n.translate('xpack.uptime.monitorStatusBar.sslCertificate.title', {
          defaultMessage: 'Certificate:',
        })}
      </MonListTitle>

      <EuiSpacer size="s" />
      <MonListDescription>
        <EuiFlexGroup wrap>
          <EuiFlexItem grow={false}>
            <Link to={CERTIFICATES_ROUTE} className="eui-displayInline">
              <CertStatusColumn cert={tls} />
            </Link>
          </EuiFlexItem>
        </EuiFlexGroup>
      </MonListDescription>
    </>
  ) : null;
};
