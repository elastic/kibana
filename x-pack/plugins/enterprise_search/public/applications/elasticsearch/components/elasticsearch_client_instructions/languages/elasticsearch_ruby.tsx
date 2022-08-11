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

export const ElasticsearchRuby: React.FC<{ cloudId?: string }> = ({ cloudId }) => {
  return (
    <>
      <EuiText>
        <p>
          The <code>elasticsearch</code>{' '}
          <a target="_blank" rel="noopener" href="http://rubygems.org/gems/elasticsearch">
            Rubygem
          </a>{' '}
          provides a low-level client for communicating with an Elasticsearch cluster, fully
          compatible with other official clients.
        </p>
        <EuiLink target="_blank" href={docLinks.clientsRubyOverview}>
          Learn more about the Ruby client for Elasticsearch
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href="https://github.com/elastic/elasticsearch-ruby">
          The Elasticsearch Ruby client on Github
        </EuiLink>
        <EuiSpacer size="m" />
        <EuiLink target="_blank" href="http://rubydoc.info/gems/elasticsearch">
          The Elasticsearch Ruby client on RubyDoc
        </EuiLink>

        <EuiSpacer />

        <p>Check out these other official Ruby libraries for working with Elasticsearch:</p>
        <ul>
          <li>
            <a
              target="_blank"
              rel="noopener"
              href="https://github.com/elasticsearch/elasticsearch-rails"
            >
              elasticsearch-rails
            </a>{' '}
            - integration with Ruby models and Rails applications.
          </li>
          <li>
            <a
              target="_blank"
              rel="noopener"
              href="https://github.com/elastic/elasticsearch-ruby/tree/7.17/elasticsearch-extensions"
            >
              elasticsearch-extensions
            </a>
            , deprecated.
          </li>
          <li>
            <a
              target="_blank"
              rel="noopener"
              href="https://github.com/elastic/elasticsearch-dsl-ruby"
            >
              elasticsearch-dsl
            </a>{' '}
            which provides a Ruby API for the{' '}
            <a target="_blank" rel="noopener" href={docLinks.queryDsl}>
              Elasticsearch Query DSL
            </a>
            .
          </li>
        </ul>
      </EuiText>

      <EuiSpacer />

      <EuiText>
        <h4>Installation</h4>
        <p>
          Install the <code>elasticsearch</code> gem from Rubygems:
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable language="shell">
        {dedent`
          $ gem install elasticsearch
        `}
      </EuiCodeBlock>
      <EuiSpacer size="s" />
      <EuiText>
        <p>Or add it to your project’s Gemfile:</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiCodeBlock fontSize="m" isCopyable>
        {dedent`
          gem 'elasticsearch', '<ELASTICSEARCH_VERSION>'
        `}
      </EuiCodeBlock>

      <EuiSpacer />

      {cloudId ? (
        <>
          <EuiText>
            <h4>Connecting to Elastic Cloud</h4>
            <p>
              If you are using Elastic Cloud, the client offers an easy way to connect to it. You
              must pass the Cloud ID that you can find in the cloud console.
            </p>
            <p>
              You can connect to Elastic Cloud using <strong>Basic authentication</strong> or an{' '}
              <strong>API key</strong>. Where {'<cloud-id>'} is reported in the Deployment UI. For
              basic authentication, {'<username>'} and {'<password>'} are generated when you deploy
              a new cloud instance. You’ll need to store the {'<username>'} and {'<password>'} since
              they will not be available via UI.
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeBlock fontSize="m" isCopyable language="ruby">
            {dedent`
              require 'elasticsearch'

              // Connect via basic authentication
              client = Elasticsearch::Client.new(
                cloud_id: '${cloudId}'
                user: '<Username>',
                password: '<Password>',
              )
              
              // Connect via API key
              client = Elasticsearch::Client.new( 
                cloud_id: '${cloudId}', 
                api_key: {id: '<Id>', api_key: '<APIKey>'} 
              )
            `}
          </EuiCodeBlock>
        </>
      ) : (
        <>
          <EuiText>
            <h4>Connecting to Elasticsearch</h4>
            <p>
              There are several ways to authenticate to Elasticsearch running outside of Cloud,
              including API keys, bearer tokens, and basic authentication.{' '}
              <a target="_blank" rel="noopener" href={docLinks.clientsRubyAuthentication}>
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
