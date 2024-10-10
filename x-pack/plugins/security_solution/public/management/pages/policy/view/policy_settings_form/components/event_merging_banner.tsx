/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export interface EventMergingBannerProps {
  onDismiss: () => void;
}

export const EventMergingBanner = memo<EventMergingBannerProps>(({ onDismiss }) => {
  const { docLinks } = useKibana().services;
  const bannerTitle = i18n.translate(
    'xpack.securitySolution.endpoint.policy.eventMergingBanner.title',
    {
      defaultMessage: "We've recently changed Linux event collection",
    }
  );

  return (
    <EuiCallOut title={bannerTitle} onDismiss={onDismiss} data-test-subj="eventMergingCallout">
      <EuiText size="s">
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.eventMergingBanner.body"
          defaultMessage="Elastic Agent 8.16+ produces less telemetry without reducing system visibility, which may impact existing event filters. For more about these changes and how to adjust your settings, visit our {documentation}."
          values={{
            documentation: (
              <EuiLink
                href={docLinks?.links.securitySolution.eventMerging}
                target="_blank"
                data-test-subj="eventMergingDocLink"
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.eventMergingBanner.doc.link"
                  defaultMessage="documentation"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </EuiCallOut>
  );
});
EventMergingBanner.displayName = 'EventMergingBanner';
