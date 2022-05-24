/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import dedent from 'dedent';

import { EuiCodeBlock, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';

import { docLinks } from '../../../../shared/doc_links';

export const ElasticsearchJavascript: React.FC<{ cloudId?: string }> = ({ cloudId }) => {
  return (
    <>
      <EuiText>
        <p>
          This is the official Node.js client for Elasticsearch includes all the features you need
          to add search to any Node.js application:
        </p>
        <ul>
          <li>One-to-one mapping with REST API.</li>
          <li>Generalized, pluggable architecture.</li>
          <li>Configurable, automatic discovery of cluster nodes.</li>
          <li>Persistent, Keep-Alive connections.</li>
          <li>Load balancing across all available nodes.</li>
          <li>Child client support.</li>
          <li>TypeScript support out of the box.</li>
        </ul>
        <EuiLink target="_blank" href={docLinks.clientsJsIntro}>
          Learn more about the official Node.js client for Elasticsearch
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href="https://github.com/elastic/elasticsearch-js">
          The official Node.js client for Elasticsearch on Github
        </EuiLink>
      </EuiText>

      <EuiSpacer />

      <EuiText>
        <h4>Installation</h4>
        <p>To install the latest version of the client, run the following command:</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable language="shell">
        npm install @elastic/elasticsearch
      </EuiCodeBlock>

      <EuiSpacer />

      {cloudId ? (
        <>
          <EuiText>
            <h4>Connecting to Elastic Cloud</h4>
            <p>
              If you are using Elastic Cloud, the client offers an easy way to connect to it via the
              cloud option. You must pass the Cloud ID that you can find in the cloud console, then
              your username and password inside the auth option.
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeBlock fontSize="m" isCopyable language="javascript">
            {dedent`
              const { Client } = require('@elastic/elasticsearch')
              const client = new Client({
                cloud: {
                  id: '${cloudId}',
                },
                auth: {
                  username: '<username>',
                  password: '<password>'
                }
              })`}
          </EuiCodeBlock>
        </>
      ) : (
        <>
          <EuiText>
            <h4>Connecting to Elasticsearch</h4>
            <p>
              There are several ways to connect and authenticate to Elasticsearch running outside of
              Cloud, including API keys, bearer tokens, and basic authentication.{' '}
              <a target="_blank" rel="noopener" href={docLinks.clientsJsClientConnecting}>
                Visit the client’s documentation to learn more
              </a>
              .
            </p>
          </EuiText>
        </>
      )}
    </>
  );
};
