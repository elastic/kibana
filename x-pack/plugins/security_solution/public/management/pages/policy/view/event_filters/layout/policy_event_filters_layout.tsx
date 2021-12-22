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
  EuiPageContent,
} from '@elastic/eui';
import { useAppUrl } from '../../../../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../../../../common/constants';
import { ImmutableObject, PolicyData } from '../../../../../../../common/endpoint/types';
import { getEventFiltersListPath } from '../../../../../common/routing';
import { useGetAllAssignedEventFilters, useGetAllEventFilters } from '../hooks';
import { ManagementPageLoader } from '../../../../../components/management_page_loader';
import { PolicyEventFiltersEmptyUnassigned, PolicyEventFiltersEmptyUnexisting } from '../empty';
import { PolicyEventFiltersList } from '../list';

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

    const {
      data: allEventFilters,
      isLoading: isLoadingAllEventFilters,
      isRefetching: isRefetchingAllEventFilters,
    } = useGetAllEventFilters();

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
      () =>
        isLoadingAllAssigned ||
        isRefetchingAllAssigned ||
        isLoadingAllEventFilters ||
        isRefetchingAllEventFilters,
      [
        isLoadingAllAssigned,
        isLoadingAllEventFilters,
        isRefetchingAllAssigned,
        isRefetchingAllEventFilters,
      ]
    );

    const isEmptyState = useMemo(() => allAssigned && allAssigned.total === 0, [allAssigned]);

    if (!policyItem || isGlobalLoading) {
      return <ManagementPageLoader data-test-subj="policy-event-filters-loading-spinner" />;
    }

    if (isEmptyState) {
      return allEventFilters && allEventFilters.total !== 0 ? (
        <PolicyEventFiltersEmptyUnassigned policyId={policyItem.id} policyName={policyItem.name} />
      ) : (
        <PolicyEventFiltersEmptyUnexisting policyId={policyItem.id} policyName={policyItem.name} />
      );
    }

    return (
      <div>
        <EuiPageHeader alignItems="center">
          <EuiPageHeaderSection data-test-subj="policy-event-filters-header-section">
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

            <EuiText size="xs" data-test-subj="policy-event-filters-layout-about">
              <p>{aboutInfo}</p>
            </EuiText>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiSpacer size="l" />
        <EuiPageContent
          hasBorder={false}
          hasShadow={false}
          paddingSize="none"
          color="transparent"
          borderRadius="none"
        >
          <PolicyEventFiltersList policyId={policyItem.id} />
        </EuiPageContent>
      </div>
    );
  }
);

PolicyEventFiltersLayout.displayName = 'PolicyEventFiltersLayout';
