/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { LinkToApp } from '../../../../../../common/components/endpoint/link_to_app';
import { APP_UI_ID, SecurityPageName } from '../../../../../../../common';

export const RelatedDetectionRulesCallout = memo<{ 'data-test-subj'?: string }>(
  ({ 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <EuiCallOut iconType="iInCircle" data-test-subj={getTestId()}>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.details.detectionRulesMessage"
          defaultMessage="View {detectionRulesLink}. Prebuilt rules are tagged “Elastic” on the Detection Rules page."
          values={{
            detectionRulesLink: (
              <LinkToApp
                appId={APP_UI_ID}
                deepLinkId={SecurityPageName.rules}
                data-test-subj={getTestId('link')}
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policy.details.detectionRulesLink"
                  defaultMessage="related detection rules"
                />
              </LinkToApp>
            ),
          }}
        />
      </EuiCallOut>
    );
  }
);
RelatedDetectionRulesCallout.displayName = 'RelatedDetectionRulesCallout';
