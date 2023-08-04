/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState} from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSpacer,
  EuiText,
  EuiLink,
} from '@elastic/eui';

import { APP_WRAPPER_CLASS, useExecutionContext } from '../../../../shared_imports';
import { useAppContext } from '../../../app_context';

import { useLoadEnrichPolicies } from '../../../services/api';
import { PageLoading, PageError } from '../../../../shared_imports';
import { PoliciesTable } from './policies_table';
import { DeletePolicyModal } from './confirm_modals';

type policyType = 'match' | 'geo_match' | 'range' | '';

interface BaseTypes {
  name: string;
  sourceIndices: string[];
  matchField: string;
  enrichFields: string[];
}

export interface EnrichPolicy extends BaseTypes {
  type: policyType
};

interface BaseEnrichPolicy {
  config: {
    match?: BaseTypes
    geo_match?: BaseTypes
    range?: BaseTypes
  }
}

const getPolicyType = (policy: BaseEnrichPolicy): policyType => {
  if (policy.config.match) {
    return 'match';
  }

  if (policy.config.geo_match) {
    return 'geo_match';
  }

  if (policy.config.range) {
    return 'range';
  }

  return '';
};

const serializeEnrichmentPolicies = (policies: BaseEnrichPolicy[]) => {
  return policies.map((policy: any) => {
    const policyType = getPolicyType(policy);

    return {
      name: policy.config[policyType].name,
      type: policyType,
      sourceIndices: policy.config[policyType].indices,
      matchField: policy.config[policyType].match_field,
      enrichFields: policy.config[policyType].enrich_fields,
    };
  });
};

export const EnrichPoliciesList = () => {
  const {
    core: { executionContext },
  } = useAppContext();

  useExecutionContext(executionContext, {
    type: 'application',
    page: 'indexManagementEnrichPoliciesTab',
  });

  const [policyToDelete, setPolicyToDelete] = useState<string | undefined>();

  const {
    error,
    isLoading,
    data,
    resendRequest: reload,
  } = useLoadEnrichPolicies();

  if (isLoading) {
    return (
      <PageLoading>
        <FormattedMessage
          id="xpack.idxMgmt.enrichPoliciesList.loadingEnrichPoliciesDescription"
          defaultMessage="Loading enrich policies…"
        />
      </PageLoading>
    );
  }

  if (error) {
    return (
      <PageError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.enrichPoliciesList.loadingEnrichPoliciesErrorMessage"
            defaultMessage="Error loading enrich policies"
          />
        }
        error={error}
      />
    );
  }

  return (
    <div className={`${APP_WRAPPER_CLASS} im-snapshotTestSubject`} data-test-subj="indicesList">
      <EuiText color="subdued">
        <FormattedMessage
          id="xpack.idxMgmt.enrichPoliciesList.enrichPoliciesDescription"
          defaultMessage="Enrich policies allow you to enrich your data by adding context via additional data. {learnMoreLink}"
          values={{
            learnMoreLink: (
              <EuiLink
                href={'/todo'}
                target="_blank"
                external
              >
                Learn more
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="l" />

      <PoliciesTable
        policies={serializeEnrichmentPolicies(data.policies)}
        onReloadClick={reload}
        onDeletePolicyClick={setPolicyToDelete}
      />

      {policyToDelete ? (
        <DeletePolicyModal
          policyToDelete={policyToDelete}
          callback={(deleteResponse) => {
            if (deleteResponse?.hasDeletedPolicy) {
              // reload policies list
              reload();
            }
            setPolicyToDelete(undefined);
          }}
        />
      ) : null}
    </div>
  );
};
