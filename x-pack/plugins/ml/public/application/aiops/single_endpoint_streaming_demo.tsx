/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { SingleEndpointStreamingDemo } from '@kbn/aiops-plugin/public';
import { useMlKibana, useTimefilter } from '../contexts/kibana';
import { HelpMenu } from '../components/help_menu';

import { MlPageHeader } from '../components/page_header';

export const SingleEndpointStreamingDemoPage: FC = () => {
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });
  const {
    services: { docLinks },
  } = useMlKibana();

  return (
    <>
      <MlPageHeader>
        <FormattedMessage
          id="xpack.ml.singleEndpointStreamingDemo.pageHeader"
          defaultMessage="Single endpoint streaming demo"
        />
      </MlPageHeader>
      <SingleEndpointStreamingDemo />
      <HelpMenu docLink={docLinks.links.ml.guide} />
    </>
  );
};
