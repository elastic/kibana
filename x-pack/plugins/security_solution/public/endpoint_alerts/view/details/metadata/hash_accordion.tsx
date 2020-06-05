/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiDescriptionList } from '@elastic/eui';
import { Immutable } from '../../../../../common/endpoint/types';
import { AlertData } from '../../../../../common/endpoint_alerts/types';

export const HashAccordion = memo(({ alertData }: { alertData: Immutable<AlertData> }) => {
  const columns = useMemo(() => {
    return [
      {
        title: i18n.translate(
          'xpack.securitySolution.endpoint.application.endpoint.alertDetails.md5',
          {
            defaultMessage: 'MD5',
          }
        ),
        description: alertData.file.hash.md5,
      },
      {
        title: i18n.translate(
          'xpack.securitySolution.endpoint.application.endpoint.alertDetails.sha1',
          {
            defaultMessage: 'SHA1',
          }
        ),
        description: alertData.file.hash.sha1,
      },
      {
        title: i18n.translate(
          'xpack.securitySolution.endpoint.application.endpoint.alertDetails.sha256',
          {
            defaultMessage: 'SHA256',
          }
        ),
        description: alertData.file.hash.sha256,
      },
    ];
  }, [alertData]);

  return (
    <EuiAccordion
      id="alertDetailsHashAccordion"
      buttonContent={i18n.translate(
        'xpack.securitySolution.endpoint.application.endpoint.alertDetails.accordionTitles.hash',
        {
          defaultMessage: 'Hash',
        }
      )}
      paddingSize="l"
      data-test-subj="alertDetailsHashAccordion"
    >
      <EuiDescriptionList type="column" listItems={columns} />
    </EuiAccordion>
  );
});

HashAccordion.displayName = 'HashAccordion';
