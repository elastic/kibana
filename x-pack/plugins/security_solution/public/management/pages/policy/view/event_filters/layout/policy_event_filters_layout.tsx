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
} from '@elastic/eui';
import { policyDetails } from '../../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { useAppUrl } from '../../../../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../../../../common/constants';
import { getEventFiltersListPath } from '../../../../../common/routing';

export const PolicyEventFiltersLayout = React.memo(() => {
  const { getAppUrl } = useAppUrl();
  const policyItem = usePolicyDetailsSelector(policyDetails);

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
          count: 0, // TODO. To be implemented
          link,
        }}
      />
    );
  }, [getAppUrl]);

  return policyItem ? (
    <div>
      <EuiPageHeader alignItems="center">
        <EuiPageHeaderSection>
          <EuiTitle size="m">
            <h2>
              {i18n.translate('xpack.securitySolution.endpoint.policy.eventFilters.layout.title', {
                defaultMessage: 'Assigned event filters',
              })}
            </h2>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiText size="xs">
            <p>{aboutInfo}</p>
          </EuiText>
        </EuiPageHeaderSection>
      </EuiPageHeader>
    </div>
  ) : null;
});

PolicyEventFiltersLayout.displayName = 'PolicyEventFiltersLayout';
