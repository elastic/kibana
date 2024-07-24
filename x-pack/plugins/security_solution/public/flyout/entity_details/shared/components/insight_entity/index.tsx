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
import { useLatestFindings } from '@kbn/cloud-security-posture-plugin/public';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { MisconfigurationsOverview } from './misconfigurations_overview';

export const InsightEntity = <T,>({ hostName }: { hostName: string }) => {
  const { euiTheme } = useEuiTheme();

  const queryHostName = {
    bool: {
      must: [],
      filter: [
        {
          bool: {
            should: [{ term: { 'host.name': { value: `${hostName}` } } }],
            minimum_should_match: 1,
          },
        },
      ],
      should: [],
      must_not: [],
    },
  };
  const { data } = useLatestFindings({
    query: queryHostName,
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const passed = data?.pages[0].count.passed || 0;
  const failed = data?.pages[0].count.failed || 0;

  return (
    <>
      <InspectButtonContainer>
        <EuiAccordion
          initialIsOpen={true}
          id="observedEntity-accordion"
          data-test-subj="observedEntity-accordion"
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
          <MisconfigurationsOverview passedFindings={passed} failedFindings={failed} />
          <EuiSpacer size="m" />
        </EuiAccordion>
      </InspectButtonContainer>
    </>
  );
};
