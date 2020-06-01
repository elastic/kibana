/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiDescriptionList, EuiHealth } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { Immutable } from '../../../../../common/endpoint/types';
import { AlertDetails } from '../../../../../common/endpoint_alerts/types';

export const HostAccordion = memo(({ alertData }: { alertData: Immutable<AlertDetails> }) => {
  const columns = useMemo(() => {
    return [
      {
        title: i18n.translate(
          'xpack.siem.endpoint.application.endpoint.alertDetails.hostNameCurrent',
          {
            defaultMessage: 'Host Name (Current)',
          }
        ),
        description: alertData.state.host_metadata.host.hostname,
      },
      {
        title: i18n.translate(
          'xpack.siem.endpoint.application.endpoint.alertDetails.hostNameOriginal',
          {
            defaultMessage: 'Host Name (At time of alert)',
          }
        ),
        description: alertData.host.hostname,
      },
      {
        title: i18n.translate(
          'xpack.siem.endpoint.application.endpoint.alertDetails.hostIPCurrent',
          {
            defaultMessage: 'Host IP (Current)',
          }
        ),
        description: alertData.state.host_metadata.host.ip.join(', '),
      },
      {
        title: i18n.translate(
          'xpack.siem.endpoint.application.endpoint.alertDetails.hostIPOriginal',
          {
            defaultMessage: 'Host IP (At time of alert)',
          }
        ),
        description: alertData.host.ip.join(', '),
      },
      {
        title: i18n.translate(
          'xpack.siem.endpoint.application.endpoint.alertDetails.currentStatus',
          {
            defaultMessage: 'Current Status',
          }
        ),
        description: (
          <EuiHealth color="success">
            {' '}
            <FormattedMessage
              id="xpack.siem.endpoint.application.endpoint.alertDetails.endpoint.status.online"
              defaultMessage="Online"
            />
          </EuiHealth>
        ),
      },
      {
        title: i18n.translate('xpack.siem.endpoint.application.endpoint.alertDetails.osCurrent', {
          defaultMessage: 'OS (Current)',
        }),
        description: alertData.state.host_metadata.host.os.name,
      },
      {
        title: i18n.translate('xpack.siem.endpoint.application.endpoint.alertDetails.osOriginal', {
          defaultMessage: 'OS (At time of alert)',
        }),
        description: alertData.host.os.name,
      },
    ];
  }, [alertData]);

  return (
    <EuiAccordion
      id="alertDetailsHostAccordion"
      buttonContent={i18n.translate(
        'xpack.siem.endpoint.application.endpoint.alertDetails.accordionTitles.host',
        {
          defaultMessage: 'Host',
        }
      )}
      paddingSize="l"
      data-test-subj="alertDetailsHostAccordion"
    >
      <EuiDescriptionList type="column" listItems={columns} />
    </EuiAccordion>
  );
});

HostAccordion.displayName = 'HostAccordion';
