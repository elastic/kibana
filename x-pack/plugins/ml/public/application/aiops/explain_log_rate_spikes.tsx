/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { ExplainLogRateSpikes } from '@kbn/aiops-plugin/public';

import { useMlContext } from '../contexts/ml';
import { useMlKibana } from '../contexts/kibana';
import { HelpMenu } from '../components/help_menu';

import { MlPageHeader } from '../components/page_header';

export const ExplainLogRateSpikesPage: FC = () => {
  const {
    services: { docLinks },
  } = useMlKibana();

  const context = useMlContext();
  const dataView = context.currentDataView;

  return (
    <>
      <MlPageHeader>
        <FormattedMessage
          id="xpack.ml.explainLogRateSpikes.pageHeader"
          defaultMessage="Explain log rate spikes"
        />
      </MlPageHeader>
      {dataView.timeFieldName && <ExplainLogRateSpikes dataView={dataView} />}
      <HelpMenu docLink={docLinks.links.ml.guide} />
    </>
  );
};
