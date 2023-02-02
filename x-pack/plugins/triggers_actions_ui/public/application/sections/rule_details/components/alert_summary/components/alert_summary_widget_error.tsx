/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const AlertSummaryWidgetError = () => {
  return (
    <EuiEmptyPrompt
      data-test-subj="alertSummaryWidgetError"
      iconType="alert"
      color="danger"
      title={
        <h5>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.errorLoadingTitle"
            defaultMessage="Unable to load the alerts summary"
          />
        </h5>
      }
      body={
        <p>
          {
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.errorLoadingBody"
              defaultMessage="There was an error loading the alerts summary. Contact your
                administrator for help."
            />
          }
        </p>
      }
    />
  );
};
