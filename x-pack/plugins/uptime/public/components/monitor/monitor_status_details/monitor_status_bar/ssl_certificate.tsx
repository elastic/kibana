/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { Link } from 'react-router-dom';
import { EuiSpacer, EuiText, EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Tls } from '../../../../../common/runtime_types';
import { useCertStatus } from '../../../../hooks';
import { CERT_STATUS, CERTIFICATES_ROUTE } from '../../../../../common/constants';

interface Props {
  /**
   * TLS information coming from monitor in ES heartbeat index
   */
  tls: Tls | null | undefined;
}

export const MonitorSSLCertificate = ({ tls }: Props) => {
  const certStatus = useCertStatus(tls?.not_after);

  const isExpiringSoon = certStatus === CERT_STATUS.EXPIRING_SOON;

  const isExpired = certStatus === CERT_STATUS.EXPIRED;

  const relativeDate = moment(tls?.not_after).fromNow();

  return certStatus ? (
    <>
      <EuiText>
        {i18n.translate('xpack.uptime.monitorStatusBar.sslCertificate.title', {
          defaultMessage: 'Certificate',
        })}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiText
            className="eui-displayInline"
            grow={false}
            size="s"
            aria-label={
              isExpired
                ? i18n.translate(
                    'xpack.uptime.monitorStatusBar.sslCertificateExpired.label.ariaLabel',
                    {
                      defaultMessage: 'Expired {validityDate}',
                      values: { validityDate: relativeDate },
                    }
                  )
                : i18n.translate(
                    'xpack.uptime.monitorStatusBar.sslCertificateExpiry.label.ariaLabel',
                    {
                      defaultMessage: 'Expires {validityDate}',
                      values: { validityDate: relativeDate },
                    }
                  )
            }
          >
            {isExpired ? (
              <FormattedMessage
                id="xpack.uptime.monitorStatusBar.sslCertificateExpired.badgeContent"
                defaultMessage="Expired {emphasizedText}"
                values={{
                  emphasizedText: <EuiBadge color={'danger'}>{relativeDate}</EuiBadge>,
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.uptime.monitorStatusBar.sslCertificateExpiry.badgeContent"
                defaultMessage="Expires {emphasizedText}"
                values={{
                  emphasizedText: (
                    <EuiBadge color={isExpiringSoon ? 'warning' : 'default'}>
                      {relativeDate}
                    </EuiBadge>
                  ),
                }}
              />
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <Link to={CERTIFICATES_ROUTE} className="eui-displayInline">
            <EuiText>
              {i18n.translate('xpack.uptime.monitorStatusBar.sslCertificate.overview', {
                defaultMessage: 'Certificate overview',
              })}
            </EuiText>
          </Link>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  ) : null;
};
