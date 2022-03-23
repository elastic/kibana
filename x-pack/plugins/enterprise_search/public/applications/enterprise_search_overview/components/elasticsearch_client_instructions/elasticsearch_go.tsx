/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import dedent from 'dedent';

import { EuiCodeBlock, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';

export const ElasticsearchGo: React.FC<{ cloudId?: string }> = ({ cloudId }) => {
  return (
    <>
      <EuiText>
        <p>
          The official Go client for Elasticsearch includes all the features you need to add search
          to a Go application:
        </p>
        <ul>
          <li>One-to-one mapping with the Elasticsearch REST API</li>
          <li>Generalized, pluggable architecture</li>
          <li>Helpers for convenience</li>
          <li>A rich set of examples in the documentation</li>
        </ul>
        <EuiLink
          target="_blank"
          href="https://www.elastic.co/guide/en/elasticsearch/client/go-api/current/index.html"
        >
          Learn more about the Go client for Elasticsearch
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href="https://github.com/elastic/go-elasticsearch">
          The Go client for Elasticsearch on Github
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href="https://godoc.org/github.com/elastic/go-elasticsearch">
          View the documentation on GoDoc
        </EuiLink>
      </EuiText>

      <EuiSpacer />

      <EuiText>
        <h4>Installation</h4>
        <p>Add the package to your go.mod file:</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable>
        {dedent`
          require github.com/elastic/go-elasticsearch/v8 main
        `}
      </EuiCodeBlock>

      <EuiSpacer />

      <EuiText>
        <h4>Getting started</h4>
        <p>
          The <code>elasticsearch</code> package ties together two separate packages for calling the
          Elasticsearch APIs and transferring data over HTTP: <code>esapi</code> and{' '}
          <code>elastictransport</code>.
        </p>
        <p>
          Use the <code>elasticsearch.NewDefaultClient()</code> function to create the client with
          the default settings.
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable>
        {dedent`
          es, err := elasticsearch.NewDefaultClient()
          if err != nil {
            log.Fatalf("Error creating the client: %s", err)
          }
          
          res, err := es.Info()
          if err != nil {
            log.Fatalf("Error getting response: %s", err)
          }
          
          defer res.Body.Close()
          log.Println(res)          
        `}
      </EuiCodeBlock>

      <EuiSpacer />

      {cloudId ? (
        <>
          <EuiText>
            <h4>Connecting to Elastic Cloud</h4>
            <p>
              If you are using Elastic Cloud, the client offers an easy way to connect to it. You
              must pass your Cloud ID to the client, which is found in the Cloud console, as well as
              a corresponding API key.
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeBlock fontSize="m" isCopyable>
            {dedent`
              cfg := elasticsearch.Config{
                CloudID: "${cloudId}",
                APIKey: "API_KEY"
              }
              es, err := elasticsearch.NewClient(cfg)
            `}
          </EuiCodeBlock>
        </>
      ) : (
        <>
          <EuiText>
            <h4>Connecting to Elasticsearch</h4>
            <p>
              To set the cluster endpoint(s) programmatically, pass a configuration object to the{' '}
              <code>elasticsearch.NewClient()</code> function. To set the username and password,
              include them in the endpoint URL, or use the corresponding configuration options.
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeBlock fontSize="m" isCopyable>
            {dedent`
              cfg := elasticsearch.Config{
                Addresses: []string{
                  "http://localhost:9200",
                  "http://localhost:9201",
                },
                Username: "<username>",
                Password: "<password>",
              }
              es, err := elasticsearch.NewClient(cfg)              
            `}
          </EuiCodeBlock>
        </>
      )}
    </>
  );
};
