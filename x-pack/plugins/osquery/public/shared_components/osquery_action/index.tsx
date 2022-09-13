/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingContent, EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import React, { useMemo } from 'react';

import {
  AGENT_STATUS_ERROR,
  EMPTY_PROMPT,
  NOT_AVAILABLE,
  PERMISSION_DENIED,
  SHORT_EMPTY_TITLE,
} from './translations';
import { useKibana } from '../../common/lib/kibana';
import { LiveQuery } from '../../live_queries';
import { OsqueryIcon } from '../../components/osquery_icon';
import { useIsOsqueryAvailable } from './use_is_osquery_available';

export interface OsqueryActionProps {
  agentId?: string;
  defaultValues?: {};
  formType: 'steps' | 'simple';
  hideAgentsField?: boolean;
  addToTimeline?: (payload: { query: [string, string]; isIcon?: true }) => React.ReactElement;
}

const OsqueryActionComponent: React.FC<OsqueryActionProps> = ({
  agentId,
  formType = 'simple',
  defaultValues,
  hideAgentsField,
  addToTimeline,
}) => {
  const permissions = useKibana().services.application.capabilities.osquery;

  const emptyPrompt = useMemo(
    () => (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>{SHORT_EMPTY_TITLE}</h2>}
        titleSize="xs"
        body={<p>{EMPTY_PROMPT}</p>}
      />
    ),
    []
  );
  const { osqueryAvailable, agentFetched, isLoading, policyFetched, policyLoading, agentData } =
    useIsOsqueryAvailable(agentId);

  if (agentId && agentFetched && !agentData) {
    return emptyPrompt;
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
            To access this page, ask your administrator for <EuiCode>osquery</EuiCode> Kibana
            privileges.
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
    return (
      <EuiEmptyPrompt
        icon={<OsqueryIcon />}
        title={<h2>{SHORT_EMPTY_TITLE}</h2>}
        titleSize="xs"
        body={<p>{NOT_AVAILABLE}</p>}
      />
    );
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
      addToTimeline={addToTimeline}
      {...defaultValues}
    />
  );
};

OsqueryActionComponent.displayName = 'OsqueryAction';

export const OsqueryAction = React.memo(OsqueryActionComponent);

// eslint-disable-next-line import/no-default-export
export { OsqueryAction as default };
