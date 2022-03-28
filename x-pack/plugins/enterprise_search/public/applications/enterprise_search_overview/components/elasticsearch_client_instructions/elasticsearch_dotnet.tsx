/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import dedent from 'dedent';

import { EuiCodeBlock, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';

import { docLinks } from '../../../shared/doc_links';

export const ElasticsearchDotnet: React.FC<{ cloudId?: string }> = ({ cloudId }) => {
  return (
    <>
      <EuiText>
        <p>
          The official .Net client for Elasticsearch includes all the features you need to add
          search to a .Net application:
        </p>
        <ul>
          <li>One-to-one mapping with REST API.</li>
          <li>Strongly typed requests and responses for Elasticsearch APIs.</li>
          <li>Fluent API for building requests.</li>
          <li>Helpers for common tasks such as bulk indexing of documents.</li>
          <li>Pluggable serialization of requests and responses based on System.Text.Json.</li>
          <li>Diagnostics, auditing, and .NET activity integration.</li>
        </ul>

        <p>
          The .NET Elasticsearch client is built upon the Elastic Transport library which provides:
        </p>
        <ul>
          <li>Connection management and load balancing across all available nodes.</li>
          <li>Request retries and dead connections handling.</li>
        </ul>

        <EuiLink target="_blank" href={docLinks.clientsNetIntroduction}>
          Learn more about the official .NET clients for Elasticsearch
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href="https://github.com/elastic/elasticsearch-net">
          The official Elasticsearch .NET clients on Github
        </EuiLink>
      </EuiText>

      <EuiSpacer />

      <EuiText>
        <h4>Installation</h4>
        <p>
          For SDK style projects, you can install the Elasticsearch client by running the following
          .NET CLI command in your terminal:
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable language="shell">
        {dedent`
          dotnet add package Elastic.Clients.Elasticsearch
        `}
      </EuiCodeBlock>
      <EuiSpacer size="s" />
      <EuiText>
        <p>
          This command adds a package reference to your project (csproj) file for the latest stable
          version of the client.
        </p>
        <p>
          If you prefer, you may also manually add a package reference inside your project file:
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable language="shell">
        {dedent`
          <PackageReference Include="Elastic.Clients.Elasticsearch" Version="ELASTICSAERCH VERSION" />
        `}
      </EuiCodeBlock>

      <EuiSpacer />

      <EuiText>
        <p>
          For Visual Studio users, the .NET client can also be installed from the Package Manager
          Console inside Visual Studio using the following command:
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable language="shell">
        {dedent`
          Install-Package Elastic.Clients.Elasticsearch
        `}
      </EuiCodeBlock>

      <EuiSpacer />

      <EuiText>
        <p>
          Alternatively, search for Elastic.Clients.Elasticsearch in the NuGet Package Manager UI.
        </p>
      </EuiText>

      <EuiSpacer />

      {cloudId ? (
        <>
          <EuiText>
            <h4>Connecting to Elastic Cloud</h4>
            <p>
              Connecting to an Elasticsearch Service deployment is achieved by providing the unique
              Cloud ID for your deployment when configuring the ElasticsearchClient instance. You
              can retrieve the Cloud ID from the homepage of the deployment in Elasticsearch
              Service. You also require suitable credentials that your application uses to
              authenticate with your deployment.
            </p>
            <p>
              As a security best practice, it is recommended to create a dedicated API key per
              application, with permissions limited to only those required for any API calls the
              application is authorized to make.
            </p>
            <p>
              The following snippet shows you how to create a client instance that connects to an
              Elasticsearch deployment in the cloud.
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeBlock fontSize="m" isCopyable language="python">
            {dedent`
              using Elastic.Clients.Elasticsearch;
              using Elastic.Transport;
              
              var client = new ElasticsearchClient("${cloudId}", new ApiKey("<API_KEY>"));
              
            `}
          </EuiCodeBlock>
        </>
      ) : (
        <>
          <EuiText>
            <h4>Connecting to Elasticsearch</h4>
            <p>
              The .Net client for Elasticsearch supports connecting to single nodes as well as
              multiple nodes utilizing a node pool.{' '}
              <a target="_blank" rel="noopener" href={docLinks.clientsNetSingleNode}>
                Visit the documentation to learn more about connecting to Elasticsearch.
              </a>
            </p>
          </EuiText>
        </>
      )}
    </>
  );
};
