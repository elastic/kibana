/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';

export const CannotReadFileCallout: FC = () => {
  return (
    <>
      <EuiSpacer size="l" />
      <EuiCallOut
        title={i18n.translate('xpack.ml.importExport.importFlyout.cannotReadFileCallout.title', {
          defaultMessage: 'File cannot be read',
        })}
        color="warning"
      >
        <div data-test-subj="mlJobMgmtImportJobsFileReadErrorCallout">
          <FormattedMessage
            id="xpack.ml.importExport.importFlyout.cannotReadFileCallout.body"
            defaultMessage="Please select a file contained Machine Learning jobs which have been exported from Kibana using the Export Jobs option"
          />
        </div>
      </EuiCallOut>
    </>
  );
};
