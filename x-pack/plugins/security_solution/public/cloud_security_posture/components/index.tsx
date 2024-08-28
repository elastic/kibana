/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';

import React from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useCspSetupStatusApi } from '@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api';
import { MisconfigurationsOverview } from './misconfiguration/misconfiguration_overview';

export const EntityInsight = <T,>({ hostName }: { hostName: string }) => {
  const { euiTheme } = useEuiTheme();
  const getSetupStatus = useCspSetupStatusApi();
  const hasMisconfigurationFindings = getSetupStatus.data?.hasMisconfigurationsFindings;

  return (
    <>
      {hasMisconfigurationFindings && (
        <EuiAccordion
          initialIsOpen={true}
          id="observedEntity-accordion"
          data-test-subj="entityInsightTestSubj"
          buttonProps={{
            'data-test-subj': 'observedEntity-accordion-button',
            css: css`
              color: ${euiTheme.colors.primary};
            `,
          }}
          buttonContent={
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.securitySolution.flyout.entityDetails.insightsTitle"
                  defaultMessage="Insights"
                />
              </h3>
            </EuiTitle>
          }
          css={css`
            .euiAccordion__optionalAction {
              margin-left: auto;
            }
          `}
        >
          <EuiSpacer size="m" />
          <MisconfigurationsOverview hostName={hostName} />
          <EuiSpacer size="m" />
        </EuiAccordion>
      )}
    </>
  );
};
