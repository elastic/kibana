/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FunctionComponent } from 'react';
import { EuiCallOut, EuiCode, EuiLink } from '@elastic/eui';

import { useCore } from '../../../../app_context';

export const SystemIndicesOverwrittenCallOut: FunctionComponent = () => {
  const { docLinks } = useCore();

  return (
    <EuiCallOut
      data-test-subj="systemIndicesInfoCallOut"
      title={i18n.translate(
        'xpack.snapshotRestore.restoreForm.stepLogistics.systemIndicesCallOut.title',
        {
          defaultMessage: 'System indices will be overwritten',
        }
      )}
      iconType="pin"
      size="s"
    >
      <FormattedMessage
        id="xpack.snapshotRestore.restoreForm.stepLogistics.systemIndicesDescription"
        defaultMessage={`When this snapshot is restored, system indices will be overwritten with data from the snapshot. {learnMoreLink}`}
        values={{
          includeGlobalStateField: <EuiCode>include_global_state</EuiCode>,
          booleanValue: <EuiCode>false</EuiCode>,
          learnMoreLink: (
            <EuiLink target="_blank" href={docLinks.links.snapshotRestore.restoreSnapshotApi}>
              {i18n.translate(
                'xpack.snapshotRestore.restoreForm.dataStreamsWarningCallOut.body.learnMoreLink',
                { defaultMessage: 'Learn more' }
              )}
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};
