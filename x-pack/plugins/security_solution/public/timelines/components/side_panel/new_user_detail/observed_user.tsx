/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiSpacer, EuiTitle, useEuiTheme, EuiPanel } from '@elastic/eui';

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';
import type { ObservedUserData } from './types';
import { useObservedUserItems } from './hooks';
import { BasicTable } from '../../../../common/components/ml/tables/basic_table';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import { getObservedUserTableColumns } from './columns';
import { ONE_WEEK_IN_HOURS } from './constants';
import { InspectButton, InspectButtonContainer } from '../../../../common/components/inspect';
import { OBSERVED_USER_QUERY_ID } from '../../../../explore/users/containers/users/observed_details';

export const ObservedUser = ({
  observedUser,
  contextID,
  scopeId,
  isDraggable,
}: {
  observedUser: ObservedUserData;
  contextID: string;
  scopeId: string;
  isDraggable: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const observedItems = useObservedUserItems(observedUser);
  const [isObservedDataToggleOpen, setObservedDataToggleOpen] = useState(false);
  const onToggleObservedData = useCallback(() => {
    setObservedDataToggleOpen((isOpen) => !isOpen);
  }, [setObservedDataToggleOpen]);
  const observedUserTableColumns = useMemo(
    () => getObservedUserTableColumns(contextID, scopeId, isDraggable),
    [contextID, scopeId, isDraggable]
  );

  return (
    <>
      <EuiTitle size="s">
        <h5>{i18n.OBSERVED_DATA_TITLE}</h5>
      </EuiTitle>
      <EuiSpacer size="l" />
      <InspectButtonContainer>
        <EuiAccordion
          isLoading={observedUser.isLoading}
          id="observedUser-data"
          data-test-subj="observedUser-data"
          forceState={isObservedDataToggleOpen ? 'open' : 'closed'}
          buttonProps={{
            'data-test-subj': 'observedUser-accordion-button',
            css: css`
              color: ${euiTheme.colors.primary};
            `,
          }}
          buttonContent={
            isObservedDataToggleOpen
              ? i18n.HIDE_OBSERVED_DATA_BUTTON
              : i18n.SHOW_OBSERVED_DATA_BUTTON
          }
          onToggle={onToggleObservedData}
          extraAction={
            <>
              <span
                css={css`
                  margin-right: ${euiTheme.size.s};
                `}
              >
                <InspectButton
                  queryId={OBSERVED_USER_QUERY_ID}
                  title={i18n.OBSERVED_USER_INSPECT_TITLE}
                />
              </span>
              {observedUser.lastSeen.date && (
                <FormattedMessage
                  id="xpack.securitySolution.timeline.userDetails.observedUserUpdatedTime"
                  defaultMessage="Updated {time}"
                  values={{
                    time: (
                      <FormattedRelativePreferenceDate
                        value={observedUser.lastSeen.date}
                        dateFormat="MMM D, YYYY"
                        relativeThresholdInHrs={ONE_WEEK_IN_HOURS}
                      />
                    ),
                  }}
                />
              )}
            </>
          }
          css={css`
            .euiAccordion__optionalAction {
              margin-left: auto;
            }
          `}
        >
          <EuiPanel color="subdued">
            <BasicTable
              loading={
                observedUser.isLoading ||
                observedUser.firstSeen.isLoading ||
                observedUser.lastSeen.isLoading ||
                observedUser.anomalies.isLoading
              }
              data-test-subj="observedUser-table"
              columns={observedUserTableColumns}
              items={observedItems}
            />
          </EuiPanel>
        </EuiAccordion>
      </InspectButtonContainer>
    </>
  );
};
