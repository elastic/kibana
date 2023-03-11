/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingContent, EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { OsqueryEmptyPrompt, OsqueryNotAvailablePrompt } from '../prompts';
import { AGENT_STATUS_ERROR, PERMISSION_DENIED, SHORT_EMPTY_TITLE } from './translations';
import { useKibana } from '../../common/lib/kibana';
import { LiveQuery } from '../../live_queries';
import { OsqueryIcon } from '../../components/osquery_icon';
import { useIsOsqueryAvailable } from '../use_is_osquery_available';

export interface OsqueryActionProps {
  agentId?: string;
  defaultValues?: {};
  formType: 'steps' | 'simple';
  hideAgentsField?: boolean;
  onSuccess?: () => void;
}

const OsqueryActionComponent: React.FC<OsqueryActionProps> = ({
  agentId,
  formType = 'simple',
  defaultValues,
  hideAgentsField,
  onSuccess,
}) => {
  const permissions = useKibana().services.application.capabilities.osquery;

  const { osqueryAvailable, agentFetched, isLoading, policyFetched, policyLoading, agentData } =
    useIsOsqueryAvailable(agentId);

  if (agentId && agentFetched && !agentData) {
    return <OsqueryEmptyPrompt />;
  }

  if (
    (!permissions.runSavedQueries || !permissions.readSavedQueries) &&
    !permissions.writeLiveQueries
  ) {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>{PERMISSION_DENIED}</h2>}
        titleSize="xs"
        body={
          <p>
            <FormattedMessage
              id="xpack.osquery.action.missingPrivileges"
              defaultMessage="To access this page, ask your administrator for {osquery} Kibana privileges."
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              values={{
                osquery: <EuiCode>osquery</EuiCode>,
              }}
            />
          </p>
        }
      />
    );
  }

  if (agentId && isLoading) {
    return <EuiLoadingContent lines={10} />;
  }

  if (agentId && !policyFetched && policyLoading) {
    return <EuiLoadingContent lines={10} />;
  }

  if (agentId && !osqueryAvailable) {
    return <OsqueryNotAvailablePrompt />;
  }

  if (agentId && agentData?.status !== 'online') {
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>{SHORT_EMPTY_TITLE}</h2>}
        titleSize="xs"
        body={<p>{AGENT_STATUS_ERROR}</p>}
      />
    );
  }

  return (
    <LiveQuery
      formType={formType}
      agentId={agentId}
      hideAgentsField={hideAgentsField}
      onSuccess={onSuccess}
      {...defaultValues}
    />
  );
};

OsqueryActionComponent.displayName = 'OsqueryAction';

export const OsqueryAction = React.memo(OsqueryActionComponent);

// eslint-disable-next-line import/no-default-export
export { OsqueryAction as default };
