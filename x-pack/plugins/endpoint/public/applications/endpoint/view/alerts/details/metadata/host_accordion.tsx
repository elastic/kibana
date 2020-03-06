/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiDescriptionList } from '@elastic/eui';
import { Immutable, AlertData } from '../../../../../../../common/types';

export const HostAccordion = memo(({ alertData }: { alertData: Immutable<AlertData> }) => {
  const columns = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.hostName', {
          defaultMessage: 'Host Name',
        }),
        description: alertData.host.hostname,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.hostIP', {
          defaultMessage: 'Host IP',
        }),
        description: alertData.host.ip.join(', '),
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.status', {
          defaultMessage: 'Status',
        }),
        description: 'TODO',
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.os', {
          defaultMessage: 'OS',
        }),
        description: alertData.host.os.name,
      },
    ];
  }, [alertData]);

  return (
    <EuiAccordion
      id="alertDetailsHostAccordion"
      buttonContent={i18n.translate(
        'xpack.endpoint.application.endpoint.alertDetails.accordionTitles.host',
        {
          defaultMessage: 'Host',
        }
      )}
      paddingSize="l"
    >
      <EuiDescriptionList type="column" listItems={columns} />
    </EuiAccordion>
  );
});
