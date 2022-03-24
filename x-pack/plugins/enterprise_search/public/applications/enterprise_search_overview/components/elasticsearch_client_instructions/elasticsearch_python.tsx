/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import dedent from 'dedent';

import { EuiCodeBlock, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';

export const ElasticsearchPython: React.FC<{ cloudId?: string }> = ({ cloudId }) => {
  return (
    <>
      <EuiText>
        <p>
          elasticsearch-py, the official Python client for Elasticsearch, is a low-level client for
          interacting with Elasticsearch’s REST API. It’s designed to be unopinionated and
          extendable.
        </p>
        <EuiLink
          target="_blank"
          href="https://www.elastic.co/guide/en/elasticsearch/client/python-api/current/overview.html"
        >
          Learn more about the Python client for Elasticsearch
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href="https://elasticsearch-py.readthedocs.io/">
          The Python client for Elasticsearch on Read the Docs
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href="https://github.com/elastic/elasticsearch-py">
          elasticsearch-py on Github
        </EuiLink>
      </EuiText>

      <EuiSpacer />

      <EuiText>
        <h4>Installation</h4>
        <p>
          Install the <code>elasticsearch</code> package with{' '}
          <a target="_blank" rel="noopener" href="https://pypi.org/project/elasticsearch">
            pip
          </a>
          :
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable>
        {dedent`
          $ python -m pip install elasticsearch
        `}
      </EuiCodeBlock>

      <EuiSpacer />

      <EuiText>
        <p>
          If your application uses async/await in Python you can install the client with the async
          extra:
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable>
        {dedent`
          $ python -m pip install elasticsearch[async]
        `}
      </EuiCodeBlock>
      <EuiSpacer size="s" />
      <EuiText>
        <p>
          Learn more about{' '}
          <a target="_blank" rel="noopener" href="https://pypi.org/project/elasticsearch">
            using asyncio with this project
          </a>
          .
        </p>
      </EuiText>

      <EuiSpacer />

      {cloudId ? (
        <>
          <EuiText>
            <h4>Connecting to Elastic Cloud</h4>
            <p>
              Cloud ID is an easy way to configure your client to work with your Elastic Cloud
              deployment. Combine the cloud_id with either basic_auth or api_key to authenticate
              with your Elastic Cloud deployment.
            </p>
            <p>
              Using cloud_id enables TLS verification and HTTP compression by default and sets the
              port to 443 unless otherwise overwritten via the port parameter or the port value
              encoded within cloud_id. Using Cloud ID also disables sniffing as a proxy is in use.
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeBlock fontSize="m" isCopyable>
            {dedent`
              from elasticsearch import Elasticsearch

              es = Elasticsearch(
                  cloud_id="${cloudId}"
              )              
            `}
          </EuiCodeBlock>
        </>
      ) : (
        <>
          <EuiText>
            <h4>Connecting to Elasticsearch</h4>
            <p>
              A single node can be specified via a <code>scheme</code>, <code>host</code>,{' '}
              <code>port</code>, and optional <code>path_prefix</code>. These values can either be
              specified manually via a URL in a string, dictionary,
              <code>NodeConfig</code>, or a list of these values. You must specify at least{' '}
              <code>scheme</code>, <code>host</code> and <code>port</code>
              for each node. All of the following are valid configurations:
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeBlock fontSize="m" isCopyable>
            {dedent`
              from elasticsearch import Elasticsearch

              # Single node via URL
              es = Elasticsearch("http://localhost:9200")
              
              # Multiple nodes via URL
              es = Elasticsearch([
                  "http://localhost:9200",
                  "http://localhost:9201",
                  "http://localhost:9202"
              ])
              
              # Single node via dictionary
              es = Elasticsearch({"scheme": "http", "host": "localhost", "port": 9200})
              
              # Multiple nodes via dictionary
              es = Elasticsearch([
                  {"scheme": "http", "host": "localhost", "port": 9200},
                  {"scheme": "http", "host": "localhost", "port": 9201},
              ])
            `}
          </EuiCodeBlock>
          <EuiSpacer size="s" />
          <EuiText>
            <p>
              There are several ways to authenticate to Elasticsearch running outside of Cloud,
              including API keys, bearer tokens, and basic authentication.{' '}
              <a
                target="_blank"
                rel="noopener"
                href="https://www.elastic.co/guide/en/elasticsearch/client/python-api/current/connecting.html#authentication"
              >
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
