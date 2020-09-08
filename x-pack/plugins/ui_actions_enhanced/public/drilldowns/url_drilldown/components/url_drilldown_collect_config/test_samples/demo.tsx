/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { UrlDrilldownConfig, UrlDrilldownScope } from '../../../types';
import { UrlDrilldownCollectConfig } from '../url_drilldown_collect_config';

export const Demo = () => {
  const [config, onConfig] = React.useState<UrlDrilldownConfig>({
    openInNewTab: false,
    url: { template: '' },
  });

  const fakeScope: UrlDrilldownScope = {
    kibanaUrl: 'http://localhost:5601/',
    context: {
      filters: [
        {
          query: { match: { extension: { query: 'jpg', type: 'phrase' } } },
          meta: { index: 'logstash-*', negate: false, disabled: false, alias: null },
        },
        {
          query: { match: { '@tags': { query: 'info', type: 'phrase' } } },
          meta: { index: 'logstash-*', negate: false, disabled: false, alias: null },
        },
        {
          query: { match: { _type: { query: 'nginx', type: 'phrase' } } },
          meta: { index: 'logstash-*', negate: false, disabled: false, alias: null },
        },
      ],
    },
    event: {
      key: 'fakeKey',
      value: 'fakeValue',
    },
  };

  return (
    <>
      <UrlDrilldownCollectConfig config={config} onConfig={onConfig} scope={fakeScope} />
      {JSON.stringify(config)}
    </>
  );
};
