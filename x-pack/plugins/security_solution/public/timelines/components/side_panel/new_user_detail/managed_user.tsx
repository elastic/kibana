/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiSpacer,
  EuiAccordion,
  EuiTitle,
  EuiPanel,
  useEuiTheme,
  EuiEmptyPrompt,
  EuiCallOut,
  useEuiFontSize,
} from '@elastic/eui';

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';

import { BasicTable } from '../../../../common/components/ml/tables/basic_table';
import { getManagedUserTableColumns } from './columns';
import { useManagedUserItems } from './hooks';

import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import type { ManagedUserData } from './types';
import { INSTALL_INTEGRATION_HREF, MANAGED_USER_QUERY_ID, ONE_WEEK_IN_HOURS } from './constants';
import { InspectButton, InspectButtonContainer } from '../../../../common/components/inspect';
import { useAppUrl } from '../../../../common/lib/kibana';

export const ManagedUser = ({
  managedUser,
  contextID,
  scopeId,
  isDraggable,
}: {
  managedUser: ManagedUserData;
  contextID: string;
  scopeId: string;
  isDraggable: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const managedItems = useManagedUserItems(managedUser.details);
  const managedUserTableColumns = useMemo(
    () => getManagedUserTableColumns(contextID, scopeId, isDraggable),
    [isDraggable, contextID, scopeId]
  );
  const { getAppUrl } = useAppUrl();

  const installedIntegrationHref = useMemo(
    () => getAppUrl({ appId: 'integrations', path: INSTALL_INTEGRATION_HREF }),
    [getAppUrl]
  );

  const xsFontSize = useEuiFontSize('xxs').fontSize;

  return (
    <>
      <InspectButtonContainer>
        <EuiAccordion
          isLoading={managedUser.isLoading}
          initialIsOpen={false}
          id={'managedUser-data'}
          data-test-subj="managedUser-data"
          buttonProps={{
            'data-test-subj': 'managedUser-accordion-button',
            css: css`
              color: ${euiTheme.colors.primary};
            `,
          }}
          buttonContent={
            <EuiTitle size="xs">
              <h5>{i18n.MANAGED_DATA_TITLE}</h5>
            </EuiTitle>
          }
          extraAction={
            <>
              <span
                css={css`
                  margin-right: ${euiTheme.size.s};
                `}
              >
                <InspectButton
                  queryId={MANAGED_USER_QUERY_ID}
                  title={i18n.MANAGED_USER_INSPECT_TITLE}
                />
              </span>
              {managedUser.lastSeen.date && (
                <span
                  css={css`
                    font-size: ${xsFontSize};
                  `}
                >
                  <FormattedMessage
                    id="xpack.securitySolution.timeline.userDetails.updatedTime"
                    defaultMessage="Updated {time}"
                    values={{
                      time: (
                        <FormattedRelativePreferenceDate
                          value={managedUser.lastSeen.date}
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
          {!managedUser.isLoading && !managedUser.isIntegrationEnabled ? (
            <EuiPanel
              data-test-subj="managedUser-integration-disable-callout"
              hasShadow={false}
              hasBorder={true}
            >
              <EuiEmptyPrompt
                title={<h2>{i18n.NO_ACTIVE_INTEGRATION_TITLE}</h2>}
                titleSize="s"
                body={<p>{i18n.NO_ACTIVE_INTEGRATION_TEXT}</p>}
                actions={
                  <EuiButton fill href={installedIntegrationHref}>
                    {i18n.ADD_EXTERNAL_INTEGRATION_BUTTON}
                  </EuiButton>
                }
              />
            </EuiPanel>
          ) : (
            <>
              {managedItems || managedUser.isLoading ? (
                <BasicTable
                  loading={managedUser.isLoading}
                  data-test-subj="managedUser-table"
                  columns={managedUserTableColumns}
                  items={managedItems ?? []}
                />
              ) : (
                <EuiCallOut
                  data-test-subj="managedUser-no-data"
                  title={i18n.NO_AZURE_DATA_TITLE}
                  color="warning"
                  iconType="help"
                >
                  <p>{i18n.NO_AZURE_DATA_TEXT}</p>
                </EuiCallOut>
              )}
            </>
          )}
        </EuiAccordion>
      </InspectButtonContainer>
    </>
  );
};
