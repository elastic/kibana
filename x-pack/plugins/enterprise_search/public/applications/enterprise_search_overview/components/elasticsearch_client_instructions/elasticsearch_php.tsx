/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import dedent from 'dedent';

import { EuiCodeBlock, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';

export const ElasticsearchPhp: React.FC<{ cloudId?: string }> = ({ cloudId }) => {
  return (
    <>
      <EuiText>
        <p>
          This official PHP client for Elasticsearch is designed to be a low-level client that does
          not stray from the Elasticsearch REST API.
        </p>
        <EuiLink
          target="_blank"
          href="https://www.elastic.co/guide/en/elasticsearch/client/php-api/current/overview.html"
        >
          Learn more about the official PHP client for Elasticsearch
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href="https://github.com/elastic/elasticsearch-php">
          The official PHP client for Elasticsearch on Github
        </EuiLink>
      </EuiText>

      <EuiSpacer />

      <EuiText>
        <h4>Installation</h4>
        <p>To install the latest version of the client, run the following command:</p>

        <p>Elasticsearch-php only has four requirements that you need to pay attention:</p>
        <ul>
          <li>PHP 7.1.0 or higher</li>
          <li>
            <a target="_blank" rel="noopener" href="http://getcomposer.org/">
              Composer
            </a>
          </li>
          <li>
            <a target="_blank" rel="noopener" href="http://php.net/manual/en/book.curl.php">
              ext-curl
            </a>
            : the Libcurl extension for PHP
          </li>
          <li>Native JSON Extensions (ext-json) 1.3.7 or higher</li>
        </ul>
        <p>
          The rest of the dependencies are automatically downloaded and installed by Composer.
          Composer is a package and dependency manager for PHP and makes it easy to install
          Elasticsearch-php.
        </p>
        <a
          target="_blank"
          rel="noopener"
          href="https://www.elastic.co/guide/en/elasticsearch/client/php-api/current/installation.html"
        >
          Visit the documentation for more information.
        </a>
      </EuiText>

      <EuiSpacer />

      {cloudId ? (
        <>
          <EuiText>
            <h4>Connecting to Elastic Cloud</h4>
            <p>
              You can connect to Elastic Cloud using <strong>Basic authentication</strong> or an{' '}
              <strong>API key</strong>. Where {'<cloud-id>'} is reported in the Deployment UI. For
              basic authentication, {'<username>'} and {'<password>'} are generated when you deploy
              a new cloud instance. You’ll need to store the {'<username>'} and {'<password>'} since
              they will not be available via UI.
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeBlock fontSize="m" isCopyable>
            {dedent`
              // Connect via basic authentication
              $client = ClientBuilder::create()
                 ->setElasticCloudId('${cloudId}')
                 ->setBasicAuthentication('<username>', '<password>')
                 ->build();
              
              // Connect with an API key
              $client = ClientBuilder::create()
                 ->setElasticCloudId('${cloudId}')
                 ->setApiKey('<id>', '<key>')
                 ->build();
            `}
          </EuiCodeBlock>
        </>
      ) : (
        <>
          <EuiText>
            <h4>Connecting to Elasticsearch</h4>
            <p>
              There are several ways to connect and authenticate to Elasticsearch running outside of
              Cloud, including API keys, bearer tokens, and basic authentication.{' '}
              <a
                target="_blank"
                rel="noopener"
                href="https://www.elastic.co/guide/en/elasticsearch/client/php-api/current/connceting.html"
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
