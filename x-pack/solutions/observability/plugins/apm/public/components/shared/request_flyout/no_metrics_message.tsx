/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutBody, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

const DOCUMENTATION_LINK = 'https://ela.st/docs-service-map-no-metrics-available';

/**
 * Shown when the flyout is opened for a grouped edge or a messaging-consumer edge —
 * cases where no RED metrics exist.
 *
 * Source: moved from service_map/popover/edge_contents.tsx MessagingEdgeNoMetricsMessage.
 */
export function RequestFlyoutNoMetricsMessage() {
  return (
    <EuiFlyoutBody>
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
              >
                {i18n.translate('xpack.apm.requestFlyout.noMetricsDocumentation', {
                  defaultMessage: 'documentation',
                })}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </EuiFlyoutBody>
  );
}
