/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import dedent from 'dedent';

import { EuiCodeBlock, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';

export const ElasticsearchPerl: React.FC = () => {
  return (
    <>
      <EuiText>
        <p>
          <code>Search::Elasticsearch</code> is the official Perl API for Elasticsearch. The
          intention of this client is to provide unopinionated and robust support for the full
          native Elasticsearch API, and includes many other features:
        </p>
        <ul>
          <li>
            HTTP backend (blocking and asynchronous with{' '}
            <a
              target="_blank"
              rel="noopener"
              href="https://metacpan.org/module/Search::Elasticsearch::Async"
            >
              Search::Elasticsearch::Async
            </a>
            )
          </li>
          <li>
            Robust networking support which handles load balancing, failure detection and failover
          </li>
          <li>Good defaults</li>
          <li>
            Helper utilities for more complex operations, such as bulk indexing, scrolled searches
            and reindexing
          </li>
          <li>Logging support via Log::Any</li>
          <li>
            Compatibility with the{' '}
            <a
              target="_blank"
              rel="noopener"
              href="https://www.elastic.co/guide/en/elasticsearch/client/index.html"
            >
              official clients
            </a>
          </li>
          <li>Easy extensibility</li>
        </ul>
        <EuiLink
          target="_blank"
          href="https://www.elastic.co/guide/en/elasticsearch/client/perl-api/current/_overview.html"
        >
          Learn more about the Elasticsearch Perl API
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href="https://metacpan.org/module/Search::Elasticsearch">
          Read the Elasticsearch Perl API documentation
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href="https://github.com/elastic/elasticsearch-perl">
          The Elasticsearch Perl client on Github
        </EuiLink>
      </EuiText>

      <EuiSpacer />

      <EuiText>
        <h4>Installation</h4>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable>
        {dedent`
          cpanm Search::Elasticsearch
        `}
      </EuiCodeBlock>
    </>
  );
};
