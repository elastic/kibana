/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters } from '@kbn/core/public';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { EuiPageTemplate, EuiText, EuiFlexGroup, EuiFlexItem, EuiCodeBlock } from '@elastic/eui';
import { EcsMappingApiResponse, CategorizationApiResponse, RelatedApiResponse } from '../common';

import { Services } from './services';
import { EcsButton } from './components/ecs_button';
import { CategorizationButton } from './components/categorization_button';
import { RelatedButton } from './components/related_button';
import { BuildIntegrationButton } from './components/build_integration_button';

type Props = Services;

function RoutingExplorer({
  runEcsGraph,
  runCategorizationGraph,
  runRelatedGraph,
  runIntegrationBuilder,
}: Props) {
  const [lastResponse, setLastResponse] = useState(
    {} as EcsMappingApiResponse | CategorizationApiResponse | RelatedApiResponse
  );
  const [currentPipeline, setCurrentPipeline] = useState({} as object);
  const [resultDocs, setResultDocs] = useState([] as object[]);
  const rawSamples = [
    '{"ei":0,"event":"user.login","uid":"b675d102-fc25-4f7a-bf5d-96468cc176ea","code":"T1000I","time":"2024-02-23T18:56:50.628Z","cluster_name":"teleport.ericbeahan.com","user":"teleport-admin","required_private_key_policy":"none","success":true,"method":"local","mfa_device":{"mfa_device_name":"otp-device","mfa_device_uuid":"d07bf388-af49-4ec2-b8a4-c8a9e785b70b","mfa_device_type":"TOTP"},"user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36","addr.remote":"136.61.214.196:50332"}',
    '{"ei":0,"event":"cert.create","uid":"efd326fc-dd13-4df8-acef-3102c2d717d3","code":"TC000I","time":"2024-02-23T18:56:50.653Z","cluster_name":"teleport.ericbeahan.com","cert_type":"user","identity":{"user":"teleport-admin","roles":["access","editor"],"logins":["root","ubuntu","ec2-user","-teleport-internal-join"],"expires":"2024-02-24T06:56:50.648137154Z","route_to_cluster":"teleport.ericbeahan.com","traits":{"aws_role_arns":null,"azure_identities":null,"db_names":null,"db_roles":null,"db_users":null,"gcp_service_accounts":null,"host_user_gid":[""],"host_user_uid":[""],"kubernetes_groups":null,"kubernetes_users":null,"logins":["root","ubuntu","ec2-user"],"windows_logins":null},"teleport_cluster":"teleport.ericbeahan.com","client_ip":"136.61.214.196","prev_identity_expires":"0001-01-01T00:00:00Z","private_key_policy":"none"}}',
    '{"ei":0,"event":"session.start","uid":"fff30583-13be-49e8-b159-32952c6ea34f","code":"T2000I","time":"2024-02-23T18:56:57.199Z","cluster_name":"teleport.ericbeahan.com","user":"teleport-admin","login":"ec2-user","user_kind":1,"sid":"293fda2d-2266-4d4d-b9d1-bd5ea9dd9fc3","private_key_policy":"none","namespace":"default","server_id":"face0091-2bf1-43fd-a16a-f1514b4119f4","server_hostname":"ip-172-31-8-163.us-east-2.compute.internal","server_labels":{"hostname":"ip-172-31-8-163.us-east-2.compute.internal","teleport.internal/resource-id":"dccb2999-9fb8-4169-aded-ec7a1c0a26de"},"addr.remote":"136.61.214.196:50339","proto":"ssh","size":"80:25","initial_command":[""],"session_recording":"node"}',
  ];
  // TODO: Just a quick way to test the return type
  const isFetchError = (response: any): response is IHttpFetchError<unknown> => {
    return 'message' in response;
  };

  // TODO: This is just a temp test UI. It will be removed once the actual UI is implemented
  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header>
        <EuiText>
          <h1>Integration Assistant test UI</h1>
        </EuiText>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EcsButton
              runEcsGraph={runEcsGraph}
              rawSamples={rawSamples}
              setCurrentPipeline={setCurrentPipeline}
              setLastResponse={setLastResponse}
              isFetchError={isFetchError}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <CategorizationButton
              runCategorizationGraph={runCategorizationGraph}
              rawSamples={rawSamples}
              currentPipeline={currentPipeline}
              setCurrentPipeline={setCurrentPipeline}
              setLastResponse={setLastResponse}
              setResultDocs={setResultDocs}
              isFetchError={isFetchError}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <RelatedButton
              runRelatedGraph={runRelatedGraph}
              rawSamples={rawSamples}
              currentPipeline={currentPipeline}
              setCurrentPipeline={setCurrentPipeline}
              setLastResponse={setLastResponse}
              setResultDocs={setResultDocs}
              isFetchError={isFetchError}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <BuildIntegrationButton
              runIntegrationBuilder={runIntegrationBuilder}
              rawSamples={rawSamples}
              isFetchError={isFetchError}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText>
              <h1>Last Response/Error</h1>
            </EuiText>
            <EuiCodeBlock language="json">{JSON.stringify(lastResponse, null, 2)}</EuiCodeBlock>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}

export const renderApp = (props: Props, element: AppMountParameters['element']) => {
  ReactDOM.render(<RoutingExplorer {...props} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
