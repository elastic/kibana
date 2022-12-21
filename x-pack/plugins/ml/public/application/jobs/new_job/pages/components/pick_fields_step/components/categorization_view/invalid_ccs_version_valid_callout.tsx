/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const InvalidCssVersionCallout: FC = () => {
  return (
    <EuiCallOut
      color="warning"
      title={i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.invalidCssVersionCallout.title',
        {
          defaultMessage: 'The data view appears to be cross-cluster',
        }
      )}
    >
      <FormattedMessage
        id="xpack.ml.newJob.wizard.pickFieldsStep.invalidCssVersionCallout.mesage"
        defaultMessage="No example categories could be found, this could be due to one of the clusters being an unsupported version."
      />
    </EuiCallOut>
  );
};
