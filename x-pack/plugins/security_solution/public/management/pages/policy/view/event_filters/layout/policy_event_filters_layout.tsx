/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiTitle,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useAppUrl } from '../../../../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../../../../common/constants';
import { ImmutableObject, PolicyData } from '../../../../../../../common/endpoint/types';
import { getEventFiltersListPath } from '../../../../../common/routing';
import { useGetAllAssignedEventFilters } from '../hooks';
import { ManagementEmptyStateWraper } from '../../../../../components/management_empty_state_wraper';

interface PolicyEventFiltersLayoutProps {
  policyItem?: ImmutableObject<PolicyData> | undefined;
}
export const PolicyEventFiltersLayout = React.memo<PolicyEventFiltersLayoutProps>(
  ({ policyItem }) => {
    const { getAppUrl } = useAppUrl();

    const {
      data: allAssigned,
      isLoading: isLoadingAllAssigned,
      isRefetching: isRefetchingAllAssigned,
    } = useGetAllAssignedEventFilters(policyItem?.id);

    const aboutInfo = useMemo(() => {
      const link = (
        <EuiLink
          href={getAppUrl({ appId: APP_UI_ID, path: getEventFiltersListPath() })}
          target="_blank"
        >
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.eventFilters.layout.about.viewAllLinkLabel"
            defaultMessage="view all event filters"
          />
        </EuiLink>
      );

      return (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.eventFilters.layout.about"
          defaultMessage="There {count, plural, one {is} other {are}} {count} event {count, plural, =1 {filter} other {filters}} associated with this policy. Click here to {link}"
          values={{
            count: allAssigned?.total || 0,
            link,
          }}
        />
      );
    }, [getAppUrl, allAssigned]);

    const isGlobalLoading = useMemo(
      () => isLoadingAllAssigned || isRefetchingAllAssigned,
      [isLoadingAllAssigned, isRefetchingAllAssigned]
    );

    const isEmptyState = useMemo(() => allAssigned && allAssigned.total === 0, [allAssigned]);

    return policyItem && !isGlobalLoading ? (
      isEmptyState ? (
        // TODO: Display empty state when needed
        <></>
      ) : (
        <div>
          <EuiPageHeader alignItems="center">
            <EuiPageHeaderSection>
              <EuiTitle size="m">
                <h2>
                  {i18n.translate(
                    'xpack.securitySolution.endpoint.policy.eventFilters.layout.title',
                    {
                      defaultMessage: 'Assigned event filters',
                    }
                  )}
                </h2>
              </EuiTitle>

              <EuiSpacer size="s" />

              <EuiText size="xs">
                <p>{aboutInfo}</p>
              </EuiText>
            </EuiPageHeaderSection>
          </EuiPageHeader>
        </div>
      )
    ) : (
      <ManagementEmptyStateWraper>
        <EuiLoadingSpinner size="l" />
      </ManagementEmptyStateWraper>
    );
  }
);

PolicyEventFiltersLayout.displayName = 'PolicyEventFiltersLayout';
