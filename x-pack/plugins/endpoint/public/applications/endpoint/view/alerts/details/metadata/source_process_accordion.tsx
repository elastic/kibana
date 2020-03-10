/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiDescriptionList } from '@elastic/eui';
import { Immutable, AlertData } from '../../../../../../../common/types';

export const SourceProcessAccordion = memo(({ alertData }: { alertData: Immutable<AlertData> }) => {
  const columns = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.processID', {
          defaultMessage: 'Process ID',
        }),
        description: alertData.process.pid,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.processName', {
          defaultMessage: 'Process Name',
        }),
        description: alertData.process.name,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.processPath', {
          defaultMessage: 'Process Path',
        }),
        description: alertData.process.executable,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.md5', {
          defaultMessage: 'MD5',
        }),
        description: alertData.process.hash.md5,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.sha1', {
          defaultMessage: 'SHA1',
        }),
        description: alertData.process.hash.sha1,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.sha256', {
          defaultMessage: 'SHA256',
        }),
        description: alertData.process.hash.sha256,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.malwareScore', {
          defaultMessage: 'MalwareScore',
        }),
        description: alertData.process.malware_classifier.score,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.parentProcessID', {
          defaultMessage: 'Parent Process ID',
        }),
        description: alertData.process.parent.pid,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.signer', {
          defaultMessage: 'Signer',
        }),
        description: alertData.process.code_signature.subject_name,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.username', {
          defaultMessage: 'Username',
        }),
        description: alertData.process.token.user,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.domain', {
          defaultMessage: 'Domain',
        }),
        description: alertData.process.token.domain,
      },
    ];
  }, [alertData]);

  return (
    <EuiAccordion
      id="alertDetailsSourceProcessAccordion"
      buttonContent={i18n.translate(
        'xpack.endpoint.application.endpoint.alertDetails.accordionTitles.sourceProcess',
        {
          defaultMessage: 'Source Process',
        }
      )}
      paddingSize="l"
    >
      <EuiDescriptionList type="column" listItems={columns} />
    </EuiAccordion>
  );
});
