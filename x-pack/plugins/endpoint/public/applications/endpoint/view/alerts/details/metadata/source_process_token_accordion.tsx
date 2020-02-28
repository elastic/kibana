/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiDescriptionList } from '@elastic/eui';
import { Immutable, AlertData } from '../../../../../../../common/types';

export const SourceProcessTokenAccordion = memo(
  ({ alertData }: { alertData: Immutable<AlertData> }) => {
    const columns = useMemo(() => {
      return [
        {
          title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.sid', {
            defaultMessage: 'SID',
          }),
          description: alertData.process.token.sid,
        },
        {
          title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.integrityLevel', {
            defaultMessage: 'Integrity Level',
          }),
          description: alertData.process.token.integrity_level,
        },
      ];
    }, [alertData]);

    return (
      <EuiAccordion
        id="alertDetailsSourceProcessTokenAccordion"
        buttonContent={i18n.translate(
          'xpack.endpoint.application.endpoint.alertDetails.accordionTitles.sourceProcessToken',
          {
            defaultMessage: 'Source Process Token',
          }
        )}
        paddingSize="l"
      >
        <EuiDescriptionList type="column" listItems={columns} />
      </EuiAccordion>
    );
  }
);
