/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useHttp } from '../../../../common/lib/kibana';
import { EventFiltersApiClient } from '../../event_filters/service/event_filters_api_client';
import { ArtifactListPage, ArtifactListPageProps } from '../../../components/artifact_list_page';
import { HostIsolationExceptionsApiClient } from '../../host_isolation_exceptions/host_isolation_exceptions_api_client';

// FIXME:PT delete this when real component is implemented
const TempDevFormComponent: ArtifactListPageProps['ArtifactFormComponent'] = (props) => {
  // For Dev. Delete once we implement this component
  // @ts-ignore
  if (!window._dev_artifact_form_props) {
    // @ts-ignore
    window._dev_artifact_form_props = [];
    // @ts-ignore
    window.console.log(window._dev_artifact_form_props);
  }
  // @ts-ignore
  window._dev_artifact_form_props.push(props);

  return (
    <div>
      <div style={{ margin: '3em 0' }}>
        {props.error ? props.error?.body?.message || props.error : ''}
      </div>
      {`TODO: ${props.mode} Form here`}
    </div>
  );
};

export const Blocklist = memo(() => {
  const http = useHttp();
  // FIXME: Implement Blocklist API client and define list
  // for now, just using Event Filters
  const eventFiltersApiClient = HostIsolationExceptionsApiClient.getInstance(http);

  return (
    <ArtifactListPage
      apiClient={eventFiltersApiClient}
      ArtifactFormComponent={TempDevFormComponent} // FIXME: Implement create/edit form
      labels={{
        pageTitle: 'Blocklist', // FIXME: Implement labels prop overrides for blocklist
        pageAboutInfo: '(DEV: temporarily using isolation exception api)',
      }}
    />
  );
});

Blocklist.displayName = 'Blocklist';
