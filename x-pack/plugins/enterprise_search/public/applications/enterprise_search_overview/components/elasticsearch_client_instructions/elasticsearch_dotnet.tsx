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

export const ElasticsearchDotnet: React.FC = () => {
  return (
    <>
      <EuiText>
        <p>Elastic builds and maintains two .NET clients for Elasticsearch:</p>
        <ul>
          <li>
            Elasticsearch.Net, a low level, dependency free client that has no opinions about how
            you build and represent your requests and responses.
          </li>
          <li>
            NEST, a high level client that maps all requests and responses as types, and comes with
            a strongly typed query DSL that maps 1 to 1 with the Elasticsearch query DSL.
          </li>
        </ul>
        <EuiLink target="_blank" href={docLinks.clientsNetIntroduction}>
          Learn more about the official .NET clients for Elasticsearch
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href="https://github.com/elastic/elasticsearch-net">
          The official Elasticsearch .NET clients on Github
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink
          target="_blank"
          href="https://www.elastic.co/guide/en/elasticsearch/client/net-api/current/elasticsearch-net.html"
        >
          Getting started with Elasticsearch.Net
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href={docLinks.clientsNetNest}>
          Getting started with NEST
        </EuiLink>
      </EuiText>

      <EuiSpacer />

      <EuiText>
        <h4>Installation</h4>
        <p>You can install Elasticsearch.Net or NEST from the package manager console:</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable language="shell">
        {dedent`
          PM> Install-Package Elasticsearch.Net
          PM> Install-Package NEST
        `}
      </EuiCodeBlock>
      <EuiSpacer size="s" />
      <EuiText>
        <p>Alternatively, simply search for Elasticsearch.Net or NEST in the package manager UI.</p>
      </EuiText>
    </>
  );
};
