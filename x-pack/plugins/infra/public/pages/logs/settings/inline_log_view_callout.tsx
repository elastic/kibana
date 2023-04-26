/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export const InlineLogViewCallout = ({
  revertToDefaultLogView,
}: {
  revertToDefaultLogView: () => void;
}) => {
  return (
    <EuiCallOut
      color="warning"
      title={i18n.translate('xpack.infra.logs.settings.inlineLogViewCalloutTitle', {
        defaultMessage: 'Inline Log View in use',
      })}
    >
      <>
        <p>
          {i18n.translate('xpack.infra.logs.settings.inlineLogViewCalloutDescription', {
            defaultMessage:
              'An inline Log View is currently being used, changes will be synchronized to the URL, but they will not be persisted.',
          })}
        </p>
        <EuiButton
          data-test-subj="infraInlineLogViewCalloutRevertToDefaultPersistedLogViewButton"
          fullWidth={false}
          fill
          onClick={revertToDefaultLogView}
        >
          <FormattedMessage
            id="xpack.infra.logs.settings.inlineLogViewCalloutButtonText"
            defaultMessage="Revert to default (persisted) Log View"
          />
        </EuiButton>
      </>
    </EuiCallOut>
  );
};
