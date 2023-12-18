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
import { EntityTable } from '../entity_table';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { InspectButton, InspectButtonContainer } from '../../../../common/components/inspect';
import * as i18n from './translations';
import type { EntityTableRows } from '../entity_table/types';
import { ONE_WEEK_IN_HOURS } from '../constants';
import type { ObservedEntityData } from './types';

export const ObservedEntity = <T,>({
  observedData,
  contextID,
  scopeId,
  isDraggable,
  observedFields,
  queryId,
}: {
  observedData: ObservedEntityData<T>;
  contextID: string;
  scopeId: string;
  isDraggable: boolean;
  observedFields: EntityTableRows<ObservedEntityData<T>>;
  queryId: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xxs').fontSize;

  return (
    <>
      <InspectButtonContainer>
        <EuiAccordion
          initialIsOpen={true}
          isLoading={observedData.isLoading}
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
              <h3>{i18n.OBSERVED_DATA_TITLE}</h3>
            </EuiTitle>
          }
          extraAction={
            <>
              <span
                css={css`
                  margin-right: ${euiTheme.size.s};
                `}
              >
                <InspectButton queryId={queryId} title={i18n.OBSERVED_DATA_TITLE} />
              </span>
              {observedData.lastSeen.date && (
                <span
                  css={css`
                    font-size: ${xsFontSize};
                  `}
                >
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.entityDetails.observedEntityUpdatedTime"
                    defaultMessage="Updated {time}"
                    values={{
                      time: (
                        <FormattedRelativePreferenceDate
                          value={observedData.lastSeen.date}
                          dateFormat="MMM D, YYYY"
                          relativeThresholdInHrs={ONE_WEEK_IN_HOURS}
                        />
                      ),
                    }}
                  />
                </span>
              )}
            </>
          }
          css={css`
            .euiAccordion__optionalAction {
              margin-left: auto;
            }
          `}
        >
          <EuiSpacer size="m" />
          <EntityTable
            contextID={contextID}
            scopeId={scopeId}
            isDraggable={isDraggable}
            data={observedData}
            entityFields={observedFields}
          />
        </EuiAccordion>
      </InspectButtonContainer>
    </>
  );
};
