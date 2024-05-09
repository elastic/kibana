/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { EuiCallOut } from '@elastic/eui';
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
      title={
        <FormattedMessage
          id="xpack.infra.logs.settings.inlineLogViewCalloutWidgetTitle"
          defaultMessage="You are configuring an embedded widget"
        />
      }
    >
      <>
        <p>
          <FormattedMessage
            id="xpack.infra.logs.settings.inlineLogViewCalloutWidgetDescription"
            defaultMessage="Changes will be synchronized to the URL, but they will not be persisted to the default Logs Stream view."
          />
        </p>
        <EuiButton
          data-test-subj="infraInlineLogViewCalloutRevertToDefaultPersistedLogViewButton"
          fullWidth={false}
          color="warning"
          onClick={revertToDefaultLogView}
        >
          <FormattedMessage
            id="xpack.infra.logs.settings.inlineLogViewCalloutButtonText"
            defaultMessage="Revert to default Logs Stream view"
          />
        </EuiButton>
      </>
    </EuiCallOut>
  );
};
