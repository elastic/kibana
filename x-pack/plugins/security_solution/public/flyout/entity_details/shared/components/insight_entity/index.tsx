/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiSpacer, EuiTitle, useEuiFontSize, useEuiTheme } from '@elastic/eui';

import React from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
// import { EntityTable } from '../entity_table';
// import { FormattedRelativePreferenceDate } from '../../../../../common/components/formatted_date';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { MisconfigurationsOverview } from './misconfigurations_overview';
// import type { EntityTableRows } from '../entity_table/types';
// import { ONE_WEEK_IN_HOURS } from '../../constants';
// import { hostname } from 'os';

/// TEST

export const InsightEntity = <T,>({
  //   observedData,
  hostName,
  contextID,
  scopeId,
  isDraggable,
  //   observedFields,
  queryId,
}: {
  //   observedData: ObservedEntityData<T>;
  hostName: string;
  contextID: string;
  scopeId: string;
  isDraggable: boolean;
  //   observedFields: EntityTableRows<ObservedEntityData<T>>;
  queryId: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xxs').fontSize;

  // const queryHostName = {
  //   bool: {
  //     must: [],
  //     filter: [
  //       {
  //         bool: {
  //           should: [{ term: { 'host.name': { value: `VM` } } }],
  //           minimum_should_match: 1,
  //         },
  //       },
  //     ],
  //     should: [],
  //     must_not: [],
  //   },
  // };
  // const { data } = useLatestFindings({
  //   query: queryHostName,
  //   sort: [],
  //   enabled: undefined,
  //   pageSize: 1,
  // });

  return (
    <>
      <InspectButtonContainer>
        <EuiAccordion
          initialIsOpen={true}
          //   isLoading={observedData.isLoading}
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
          //   extraAction={
          //     <>
          //       <span
          //         css={css`
          //           margin-right: ${euiTheme.size.s};
          //         `}
          //       >
          //         <InspectButton
          //           queryId={queryId}
          //           title={
          //             <FormattedMessage
          //               id="xpack.securitySolution.flyout.entityDetails.observedDataInspectTitle"
          //               defaultMessage="Observed data"
          //             />
          //           }
          //         />
          //       </span>
          //       {observedData.lastSeen.date && (
          //         <span
          //           css={css`
          //             font-size: ${xsFontSize};
          //           `}
          //         >
          //           <FormattedMessage
          //             id="xpack.securitySolution.flyout.entityDetails.observedEntityUpdatedTime"
          //             defaultMessage="Updated {time}"
          //             values={{
          //               time: (
          //                 <FormattedRelativePreferenceDate
          //                   value={observedData.lastSeen.date}
          //                   dateFormat="MMM D, YYYY"
          //                   relativeThresholdInHrs={ONE_WEEK_IN_HOURS}
          //                 />
          //               ),
          //             }}
          //           />
          //         </span>
          //       )}
          //     </>
          //   }
          css={css`
            .euiAccordion__optionalAction {
              margin-left: auto;
            }
          `}
        >
          <EuiSpacer size="m" />
          {/* <EntityTable
            contextID={contextID}
            scopeId={scopeId}
            isDraggable={isDraggable}
            data={observedData}
            entityFields={observedFields}
          /> */}
          <MisconfigurationsOverview passedFindings={23} failedFindings={14} />
          <EuiSpacer size="m" />
          {/* <EntityTable
            contextID={contextID}
            scopeId={scopeId}
            isDraggable={isDraggable}
            data={observedData}
            entityFields={observedFields}
          /> */}
        </EuiAccordion>
      </InspectButtonContainer>
    </>
  );
};
