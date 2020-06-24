/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';

interface Props {
  dataStream: string;
}

export const DataStreamBadge: FunctionComponent<Props> = ({ dataStream }) => {
  return (
    <EuiToolTip
      position="right"
      content={i18n.translate(
        'xpack.snapshotRestore.policyForm.stepSettings.dataStreamBadgeToolTip',
        {
          defaultMessage:
            'This is a backing index for the "{dataStream}" data stream. Excluding this index from snapshots may cause unintended data loss for this data stream in future restores.',
          values: { dataStream },
        }
      )}
    >
      <EuiBadge data-test-subj="dataStreamBadge" color="warning">
        {dataStream}
      </EuiBadge>
    </EuiToolTip>
  );
};
