/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiText } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { REQUEST_FLYOUT_EBT_ACTIONS, REQUEST_FLYOUT_EBT_ELEMENTS } from './ebt_constants';

const DOCUMENTATION_LINK = 'https://ela.st/docs-service-map-no-metrics-available';

/** Shown when the flyout is opened for an edge that has no metrics (a messaging queue source). */
export function RequestFlyoutNoMetricsMessage() {
  return (
    <EuiText color="subdued" size="s" data-test-subj="requestFlyoutNoMetricsMessage">
      <FormattedMessage
        id="xpack.apm.requestFlyout.noMetricsMessage"
        defaultMessage="No metrics available. See {documentation}."
        values={{
          documentation: (
            <EuiLink
              data-test-subj="requestFlyoutNoMetricsDocumentationLink"
              href={DOCUMENTATION_LINK}
              target="_blank"
              {...getEbtProps({
                action: REQUEST_FLYOUT_EBT_ACTIONS.OPEN_DOCUMENTATION,
                element: REQUEST_FLYOUT_EBT_ELEMENTS.NO_METRICS_MESSAGE,
              })}
            >
              {i18n.translate('xpack.apm.requestFlyout.noMetricsDocumentation', {
                defaultMessage: 'documentation',
              })}
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  );
}
