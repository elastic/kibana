/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiCallOut } from '@elastic/eui';

export const SystemIndicesOverwrittenCallOut: FunctionComponent = () => {
  return (
    <EuiCallOut
      data-test-subj="systemIndicesInfoCallOut"
      title={i18n.translate(
        'xpack.snapshotRestore.restoreForm.stepLogistics.systemIndicesCallOut.title',
        {
          defaultMessage:
            'When this snapshot is restored, system indices will be overwritten with data from the snapshot.',
        }
      )}
      iconType="pin"
      size="s"
      aria-live="polite"
      aria-atomic="true"
    />
  );
};
