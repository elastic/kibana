/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import dedent from 'dedent';

import { EuiCodeBlock, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';

export const ElasticsearchRust: React.FC = () => {
  return (
    <>
      <EuiText>
        <p>
          The official Rust client for Elasticsearch includes all the features you need to add
          search to a Rust application:
        </p>
        <ul>
          <li>Fluent builders for all Elasticsearch REST API endpoints</li>
          <li>Persistent keep-alive connections</li>
          <li>TLS support with system or custom certificates</li>
          <li>Proxy support with authentication</li>
          <li>Async support with Tokio</li>
        </ul>
        <EuiLink
          target="_blank"
          href="https://www.elastic.co/guide/en/elasticsearch/client/rust-api/current/overview.html"
        >
          Learn more about the Rust client for Elasticsearch
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href="https://github.com/elastic/elasticsearch-rs">
          The official Rust client for Elasticsearch on Github
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href="https://docs.rs/elasticsearch">
          View the documentation on docs.rs
        </EuiLink>
      </EuiText>

      <EuiSpacer />

      <EuiText>
        <h4>Installation</h4>
        <p>
          Add <code>elasticsearch</code> crate and version to Cargo.toml.
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable>
        {dedent`
          [dependencies]
          elasticsearch = "8.0.0-alpha.1"          
        `}
      </EuiCodeBlock>
      <EuiSpacer size="s" />
      <EuiText>
        <p>
          The following optional dependencies may also be useful to create requests and read
          responses
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable>
        {dedent`
          serde = "~1"
          serde_json = "~1"                  
        `}
      </EuiCodeBlock>
      <EuiSpacer size="s" />
      <EuiText>
        <p>
          The client also includes{' '}
          <a
            target="_blank"
            rel="noopener"
            href="https://github.com/elastic/elasticsearch-rs#async-support-with-tokio"
          >
            async support with tokio
          </a>
          .
        </p>
      </EuiText>
    </>
  );
};
