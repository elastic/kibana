/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiBadge } from '@elastic/eui';

export const DataStreamBadge: FunctionComponent = () => {
  return (
    <EuiBadge data-test-subj="dataStreamBadge" color="primary">
      {i18n.translate('xpack.snapshotRestore.policyForm.setSettings.dataStreamBadgeContent', {
        defaultMessage: 'Data stream',
      })}
    </EuiBadge>
  );
};
