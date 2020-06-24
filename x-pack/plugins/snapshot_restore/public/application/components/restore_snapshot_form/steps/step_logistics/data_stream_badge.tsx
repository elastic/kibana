/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';

export const DataStreamBadge: FunctionComponent = () => {
  return (
    <EuiToolTip
      position="right"
      content={i18n.translate(
        'xpack.snapshotRestore.restoreForm.stepLogistics.dataStreamBadgeToolTip',
        {
          defaultMessage:
            'This is a backing index. Excluding this index when restoring may cause unintended data loss for a data stream.',
        }
      )}
    >
      <EuiBadge data-test-subj="dataStreamBadge" color="warning">
        {i18n.translate(
          'xpack.snapshotRestore.restoreForm.stepLogistics.backingIndexBadgeContent',
          { defaultMessage: 'Backing index' }
        )}
      </EuiBadge>
    </EuiToolTip>
  );
};
