/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, FC } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { ExplainLogRateSpikes } from '@kbn/aiops-plugin/public';
import { getWindowParameters } from '@kbn/aiops-utils';
import type { WindowParameters } from '@kbn/aiops-utils';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';

import { useMlContext } from '../contexts/ml';
import { useMlKibana } from '../contexts/kibana';
import { HelpMenu } from '../components/help_menu';
import { ml } from '../services/ml_api_service';

import { MlPageHeader } from '../components/page_header';

export const ExplainLogRateSpikesPage: FC = () => {
  const {
    services: { docLinks },
  } = useMlKibana();

  const context = useMlContext();
  const dataView = context.currentDataView;

  const [windowParameters, setWindowParameters] = useState<WindowParameters | undefined>();

  useEffect(() => {
    async function fetchWindowParameters() {
      if (dataView.timeFieldName) {
        const stats: Array<{
          data: Array<{ doc_count: number; key: number }>;
          stats: [number, number];
        }> = await ml.getVisualizerFieldHistograms({
          indexPattern: dataView.title,
          fields: [{ fieldName: dataView.timeFieldName, type: KBN_FIELD_TYPES.DATE }],
          query: { match_all: {} },
          samplerShardSize: -1,
        });

        const peak = stats[0].data.reduce((p, c) => (c.doc_count >= p.doc_count ? c : p), {
          doc_count: 0,
          key: 0,
        });
        const peakTimestamp = Math.round(peak.key);

        setWindowParameters(
          getWindowParameters(peakTimestamp, stats[0].stats[0], stats[0].stats[1])
        );
      }
    }

    fetchWindowParameters();
  }, []);

  return (
    <>
      <MlPageHeader>
        <FormattedMessage
          id="xpack.ml.explainLogRateSpikes.pageHeader"
          defaultMessage="Explain log rate spikes"
        />
      </MlPageHeader>
      {dataView.timeFieldName && windowParameters && (
        <ExplainLogRateSpikes dataView={dataView} windowParameters={windowParameters} />
      )}
      <HelpMenu docLink={docLinks.links.ml.guide} />
    </>
  );
};
