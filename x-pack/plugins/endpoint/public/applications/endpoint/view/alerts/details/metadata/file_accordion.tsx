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

export const FileAccordion = memo(({ alertData }: { alertData: Immutable<AlertData> }) => {
  const columns = useMemo(() => {
    return [
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.fileName', {
          defaultMessage: 'File Name',
        }),
        description: alertData.file.name,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.filePath', {
          defaultMessage: 'File Path',
        }),
        description: alertData.file.path,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.fileSize', {
          defaultMessage: 'File Size',
        }),
        description: alertData.file.size,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.fileCreated', {
          defaultMessage: 'File Created',
        }),
        description: <FormattedDate timestamp={alertData.file.created} />,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.fileModified', {
          defaultMessage: 'File Modified',
        }),
        description: <FormattedDate timestamp={alertData.file.mtime} />,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.fileAccessed', {
          defaultMessage: 'File Accessed',
        }),
        description: <FormattedDate timestamp={alertData.file.accessed} />,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.signer', {
          defaultMessage: 'Signer',
        }),
        description: alertData.file.code_signature.subject_name,
      },
      {
        title: i18n.translate('xpack.endpoint.application.endpoint.alertDetails.owner', {
          defaultMessage: 'Owner',
        }),
        description: alertData.file.owner,
      },
    ];
  }, [alertData]);

  return (
    <EuiAccordion
      id="alertDetailsFileAccordion"
      buttonContent={i18n.translate(
        'xpack.endpoint.application.endpoint.alertDetails.accordionTitles.file',
        {
          defaultMessage: 'File',
        }
      )}
      paddingSize="l"
    >
      <EuiDescriptionList type="column" listItems={columns} />
    </EuiAccordion>
  );
});
