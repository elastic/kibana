/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { getNormalizedCloudApmUrl } from './normalize_cloud_apm_url';

function createCloudSetup({
  isCloudEnabled,
  apmUrl,
  kibanaUrl,
  elasticsearchUrl,
}: {
  isCloudEnabled: boolean;
  apmUrl?: string;
  kibanaUrl?: string;
  elasticsearchUrl?: string;
}): CloudSetup {
  return {
    isCloudEnabled,
    isServerlessEnabled: false,
    apm: {
      url: apmUrl,
      secretToken: 'token',
    },
    kibanaUrl,
    elasticsearchUrl,
    onboarding: {},
    serverless: {},
    isInTrial: () => false,
  };
}

describe('getNormalizedCloudApmUrl', () => {
  it('returns configured APM url when it already contains `.apm.`', () => {
    const cloudSetup = createCloudSetup({
      isCloudEnabled: true,
      apmUrl: 'https://v922-26a1d8.apm.eu-west-1.aws.qa.cld.elstc.co:9243',
    });

    expect(getNormalizedCloudApmUrl(cloudSetup)).toBe(
      'https://v922-26a1d8.apm.eu-west-1.aws.qa.cld.elstc.co:9243'
    );
  });

  it('derives APM url from kibana url when configured url is missing `.apm.`', () => {
    const cloudSetup = createCloudSetup({
      isCloudEnabled: true,
      apmUrl: 'https://e897a2ddbe8743c59a5f49391ab5fcb1.eu-west-1.aws.qa.cld.elstc.co:9243',
      kibanaUrl: 'https://v922-26a1d8.kb.eu-west-1.aws.qa.cld.elstc.co:9243',
    });

    expect(getNormalizedCloudApmUrl(cloudSetup)).toBe(
      'https://v922-26a1d8.apm.eu-west-1.aws.qa.cld.elstc.co:9243'
    );
  });

  it('derives APM url from `.kibana.` hostname variant', () => {
    const cloudSetup = createCloudSetup({
      isCloudEnabled: true,
      apmUrl: 'https://e897a2ddbe8743c59a5f49391ab5fcb1.eu-west-1.aws.qa.cld.elstc.co:9243',
      kibanaUrl: 'https://v922-26a1d8.kibana.eu-west-1.aws.qa.cld.elstc.co:9243',
    });

    expect(getNormalizedCloudApmUrl(cloudSetup)).toBe(
      'https://v922-26a1d8.apm.eu-west-1.aws.qa.cld.elstc.co:9243'
    );
  });

  it('strips path/query/hash from derived kibana url', () => {
    const cloudSetup = createCloudSetup({
      isCloudEnabled: true,
      apmUrl: 'https://e897a2ddbe8743c59a5f49391ab5fcb1.eu-west-1.aws.qa.cld.elstc.co:9243',
      kibanaUrl:
        'https://v922-26a1d8.kb.eu-west-1.aws.qa.cld.elstc.co:9243/s/space/app/home?foo=bar#baz',
    });

    expect(getNormalizedCloudApmUrl(cloudSetup)).toBe(
      'https://v922-26a1d8.apm.eu-west-1.aws.qa.cld.elstc.co:9243'
    );
  });

  it('falls back to inserting `.apm.` in the hostname when kibana url is unavailable', () => {
    const cloudSetup = createCloudSetup({
      isCloudEnabled: true,
      apmUrl: 'https://e897a2ddbe8743c59a5f49391ab5fcb1.eu-west-1.aws.qa.cld.elstc.co:9243',
      elasticsearchUrl:
        'https://e897a2ddbe8743c59a5f49391ab5fcb1.eu-west-1.aws.qa.cld.elstc.co:9243',
    });

    expect(getNormalizedCloudApmUrl(cloudSetup)).toBe(
      'https://e897a2ddbe8743c59a5f49391ab5fcb1.apm.eu-west-1.aws.qa.cld.elstc.co:9243'
    );
  });

  it('does not rewrite when kibana url is unavailable and the configured url does not match elasticsearch', () => {
    const cloudSetup = createCloudSetup({
      isCloudEnabled: true,
      apmUrl: 'https://e897a2ddbe8743c59a5f49391ab5fcb1.eu-west-1.aws.qa.cld.elstc.co:9243',
      elasticsearchUrl: 'https://something-else.eu-west-1.aws.qa.cld.elstc.co:9243',
    });

    expect(getNormalizedCloudApmUrl(cloudSetup)).toBe(
      'https://e897a2ddbe8743c59a5f49391ab5fcb1.eu-west-1.aws.qa.cld.elstc.co:9243'
    );
  });

  it('does not rewrite the configured url when not running on Cloud', () => {
    const cloudSetup = createCloudSetup({
      isCloudEnabled: false,
      apmUrl: 'https://example.com:8200',
      kibanaUrl: 'https://whatever.kb.example.com:9243',
    });

    expect(getNormalizedCloudApmUrl(cloudSetup)).toBe('https://example.com:8200');
  });
});
