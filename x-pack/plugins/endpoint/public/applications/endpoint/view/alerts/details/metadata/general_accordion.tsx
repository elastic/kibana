/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiDescriptionList } from '@elastic/eui';
import { Immutable, AlertData } from '../../../../../../../common/types';
import { FormattedDate } from '../../formatted_date';

export const GeneralAccordion = memo(({ alertData }: { alertData: Immutable<AlertData> }) => {
  const columns = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.alertType', {
          defaultMessage: 'Alert Type',
        }),
        description: alertData.event.category,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.eventType', {
          defaultMessage: 'Event Type',
        }),
        description: alertData.event.kind,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.status', {
          defaultMessage: 'Status',
        }),
        description: 'TODO',
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.dateCreated', {
          defaultMessage: 'Date Created',
        }),
        description: <FormattedDate timestamp={alertData['@timestamp']} />,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.malwareScore', {
          defaultMessage: 'MalwareScore',
        }),
        description: alertData.file.malware_classifier.score,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.fileName', {
          defaultMessage: 'File Name',
        }),
        description: alertData.file.name,
      },
    ];
  }, [alertData]);
  return (
    <EuiAccordion
      id="alertDetailsAlertAccordion"
      buttonContent={i18n.translate(
        'xpack.endpoint.application.endpoint.alertDetails.accordionTitles.alert',
        {
          defaultMessage: 'Alert',
        }
      )}
      paddingSize="l"
      initialIsOpen={true}
    >
      <EuiDescriptionList type="column" listItems={columns} />
    </EuiAccordion>
  );
});
