/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksStart } from '@kbn/core/public';

export const getDocLinks = () => {
  const docLinks: DocLinksStart = {
    links: {
      elasticStackGetStarted:
        'https://www.elastic.co/guide/en/elastic-stack-get-started/current/get-started-elastic-stack.html',
      fleet: {
        learnMoreBlog:
          'https://www.elastic.co/blog/elastic-agent-and-fleet-make-it-easier-to-integrate-your-systems-with-elastic',
        apiKeysLearnMore: 'https://www.elastic.co/guide/en/kibana/master/api-keys.html',
      },
    },
  } as unknown as DocLinksStart;

  return docLinks;
};
