/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { useGetUrlParams, useUrlParams } from '../../hooks';
import { deletePackagePolicy } from '../../state/monitor_management/api';
import { MonitorNotFoundPage } from '../monitor_details/monitor_not_found_page';

export const EditMonitorNotFound: React.FC = () => {
  return (
    <>
      <LeftoverIntegrationFound />
      <EuiSpacer size="m" />
      <MonitorNotFoundPage />
    </>
  );
};

const LeftoverIntegrationFound: React.FC = () => {
  const { packagePolicyId } = useGetUrlParams();
  const updateUrlParams = useUrlParams()[1];

  const [isDeleting, setIsDeleting] = useState(false);

  const { data, loading } = useFetcher(() => {
    if (!packagePolicyId || !isDeleting) return;
    return deletePackagePolicy(packagePolicyId);
  }, [isDeleting, packagePolicyId]);

  useEffect(() => {
    if (isDeleting && data && !loading) {
      updateUrlParams({ packagePolicyId: undefined }, true);
      setIsDeleting(false);
    }
  }, [data, isDeleting, loading, updateUrlParams]);

  if (!packagePolicyId) return null;

  return (
    <EuiCallOut title="Leftover integration found" color="warning" iconType="help">
      <p>
        <FormattedMessage
          id="xpack.synthetics.leftOver.errors.title"
          defaultMessage="Please click on the button below to delete the integration. Normally this should not happen.
        Since the monitor has been deleted, the integration was supposed to be deleted automatically. If
        this happens often, report it by "
        />
        <EuiLink
          data-test-subj="syntheticsLeftoverIntegrationFoundCreatingAnIssueLink"
          href="https://github.com/elastic/kibana/issues/new/choose"
        >
          <FormattedMessage
            id="xpack.synthetics.leftOver.errors.createIssue"
            defaultMessage="creating an issue."
          />
        </EuiLink>
      </p>
      <EuiButton
        data-test-subj="syntheticsUseMonitorNotFoundDeleteIntegrationButton"
        color="danger"
        isLoading={loading && isDeleting}
        onClick={() => {
          setIsDeleting(true);
        }}
      >
        <FormattedMessage
          id="xpack.synthetics.leftOver.errors.delete"
          defaultMessage="Delete integration"
        />
      </EuiButton>
    </EuiCallOut>
  );
};
