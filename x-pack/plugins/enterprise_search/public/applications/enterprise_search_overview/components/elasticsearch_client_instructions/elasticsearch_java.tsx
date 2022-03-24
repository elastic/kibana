/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import dedent from 'dedent';

import { EuiCodeBlock, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';

export const ElasticsearchJava: React.FC = () => {
  return (
    <>
      <EuiText>
        <p>
          The Elasticsearch Java API Client includes all the features you need to add search to a
          Java application:
        </p>
        <ul>
          <li>Strongly typed requests and responses for all Elasticsearch APIs.</li>
          <li>Blocking and asynchronous versions of all APIs.</li>
          <li>
            Use of fluent builders and functional patterns to allow writing concise yet readable
            code when creating complex nested structures.
          </li>
          <li>
            Seamless integration of application classes by using an object mapper such as Jackson or
            any JSON-B implementation.
          </li>
        </ul>
        <EuiLink
          target="_blank"
          href="https://www.elastic.co/guide/en/elasticsearch/client/java-api-client/8.1/introduction.html"
        >
          Learn more about the Elasticsearch JAVA API client
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href="https://github.com/elastic/elasticsearch-java">
          The Elasticsearch JAVA API client on Github
        </EuiLink>
      </EuiText>

      <EuiSpacer />

      <EuiText>
        <h4>Installation</h4>
        <p>
          There are several ways to install the Java API client.{' '}
          <a
            target="_blank"
            rel="noopener"
            href="https://www.elastic.co/guide/en/elasticsearch/client/java-api-client/current/installation.html"
          >
            Visit the client documentation to learn more
          </a>
          .
        </p>
        <h4>Connecting to Elasticsearch</h4>
        <p>The client is structured around three main components:</p>
        <ul>
          <li>
            <strong>API client classes.</strong> These provide strongly typed data structures and
            methods for Elasticsearch APIs. Since the Elasticsearch API is large, it is structured
            in feature groups (also called “namespaces”), each having its own client class.
            Elasticsearch core features are implemented in the ElasticsearchClient class.
          </li>
          <li>
            <strong>A JSON object mapper.</strong> This maps your application classes to JSON and
            seamlessly integrates them with the API client.
          </li>
          <li>
            <strong>A transport layer implementation.</strong> This is where all HTTP request
            handling takes place.
          </li>
        </ul>
        <p>The code snippet below creates and wires these three components together:</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable>
        {dedent`
          // Create the low-level client
          RestClient restClient = RestClient.builder(
              new HttpHost("localhost", 9200)).build();
          
          // Create the transport with a Jackson mapper
          ElasticsearchTransport transport = new RestClientTransport(
              restClient, new JacksonJsonpMapper());
          
          // And create the API client
          ElasticsearchClient client = new ElasticsearchClient(transport);
        `}
      </EuiCodeBlock>
      <EuiSpacer size="s" />
      <EuiText>
        <p>
          Authentication is managed by the{' '}
          <a
            target="_blank"
            rel="noopener"
            href="https://www.elastic.co/guide/en/elasticsearch/client/java-api-client/8.1/java-rest-low.html"
          >
            Java Low Level REST Client
          </a>
          . For further details on configuring authentication, refer to{' '}
          <a
            target="_blank"
            rel="noopener"
            href="https://www.elastic.co/guide/en/elasticsearch/client/java-api-client/8.1/_basic_authentication.html"
          >
            its documentation
          </a>
          .
        </p>
      </EuiText>
    </>
  );
};
