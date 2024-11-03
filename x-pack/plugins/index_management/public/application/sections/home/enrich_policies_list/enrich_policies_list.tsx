/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiText, EuiLink } from '@elastic/eui';
import { RouteComponentProps } from 'react-router-dom';
import { Location } from 'history';
import { parse } from 'query-string';

import type { SerializedEnrichPolicy } from '@kbn/index-management-shared-types';
import { APP_WRAPPER_CLASS, useExecutionContext } from '../../../../shared_imports';
import { useAppContext } from '../../../app_context';
import { useRedirectPath } from '../../../hooks/redirect_path';
import { breadcrumbService, IndexManagementBreadcrumb } from '../../../services/breadcrumbs';
import { documentationService } from '../../../services/documentation';
import { useLoadEnrichPolicies } from '../../../services/api';
import { PoliciesTable } from './policies_table';
import { DeletePolicyModal, ExecutePolicyModal } from './confirm_modals';
import { LoadingState, ErrorState, EmptyState } from './empty_states';
import { PolicyDetailsFlyout } from './details_flyout';

const getEnrichPolicyNameFromLocation = (location: Location) => {
  const { policy } = parse(location.search.substring(1));
  return policy;
};

export const EnrichPoliciesList: React.FunctionComponent<RouteComponentProps> = ({
  history,
  location,
}) => {
  const {
    core: { executionContext, capabilities },
  } = useAppContext();
  const redirectTo = useRedirectPath(history);

  useEffect(() => {
    breadcrumbService.setBreadcrumbs(IndexManagementBreadcrumb.enrichPolicies);
  }, []);

  useExecutionContext(executionContext, {
    type: 'application',
    page: 'indexManagementEnrichPoliciesTab',
  });

  // Policy details flyout
  const enrichPolicyNameFromLocation = getEnrichPolicyNameFromLocation(location);
  const [showFlyoutFor, setShowFlyoutFor] = useState<SerializedEnrichPolicy | undefined>();

  // Policy table actions
  const [policyToDelete, setPolicyToDelete] = useState<string | undefined>();
  const [policyToExecute, setPolicyToExecute] = useState<string | undefined>();

  const {
    error,
    isLoading,
    data: policies,
    resendRequest: reloadPolicies,
  } = useLoadEnrichPolicies();

  useEffect(() => {
    if (enrichPolicyNameFromLocation && policies?.length) {
      const policy = policies.find((p) => p.name === enrichPolicyNameFromLocation);
      setShowFlyoutFor(policy);
    }
  }, [enrichPolicyNameFromLocation, policies]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} resendRequest={reloadPolicies} />;
  }

  if (capabilities.index_management.manageEnrich && policies?.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className={APP_WRAPPER_CLASS} data-test-subj="enrichPoliciesList">
      <EuiText color="subdued">
        <FormattedMessage
          id="xpack.idxMgmt.enrichPolicies.list.descriptionTitle"
          defaultMessage="Use an enrich policy to automatically enhance your incoming documents with data from your existing indices. {learnMoreLink}"
          values={{
            learnMoreLink: (
              <EuiLink
                href={documentationService.getEnrichApisLink()}
                target="_blank"
                external
                data-test-subj="enrichPoliciesLearnMoreLink"
              >
                <FormattedMessage
                  id="xpack.idxMgmt.enrichPolicies.list.docsLink"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="l" />

      <PoliciesTable
        policies={policies as SerializedEnrichPolicy[]}
        onReloadClick={reloadPolicies}
        onDeletePolicyClick={setPolicyToDelete}
        onExecutePolicyClick={setPolicyToExecute}
      />

      {policyToDelete && (
        <DeletePolicyModal
          policyToDelete={policyToDelete}
          callback={(deleteResponse) => {
            if (deleteResponse?.hasDeletedPolicy) {
              reloadPolicies();
            }
            setPolicyToDelete(undefined);
          }}
        />
      )}

      {policyToExecute && (
        <ExecutePolicyModal
          policyToExecute={policyToExecute}
          callback={(executeResponse) => {
            if (executeResponse?.hasExecutedPolicy) {
              reloadPolicies();
            }
            setPolicyToExecute(undefined);
          }}
        />
      )}

      {showFlyoutFor && (
        <PolicyDetailsFlyout
          policy={showFlyoutFor}
          onClose={() => {
            setShowFlyoutFor(undefined);
            redirectTo('/enrich_policies');
          }}
        />
      )}
    </div>
  );
};
