/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCodeBlock,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const SampleResponse: React.FC = () => {
  return (
    <EuiPanel hasShadow>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.resultSettings.sampleResponseTitle',
                { defaultMessage: 'Sample response' }
              )}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {/* TODO <QueryPerformance queryPerformanceRating={queryPerformanceRating} /> */}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFieldSearch
        // TODO onChange={(e) => setQuery(e.target.value || '')}
        placeholder={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.resultSettings.sampleResponse.inputPlaceholder',
          { defaultMessage: 'Type a search query to test a response...' }
        )}
        data-test-subj="ResultSettingsQuerySampleResponse"
      />
      <EuiSpacer />
      <EuiCodeBlock language="json" whiteSpace="pre-wrap">
        {/* TODO Replace this static content with dynamic content */}
        {JSON.stringify(
          {
            visitors: {
              raw: 776218,
            },
            nps_image_url: {
              raw:
                'https://www.nps.gov/common/uploads/banner_image/imr/homepage/9E7FC0DB-1DD8-B71B-0BC3880DC2250415.jpg',
            },
            square_km: {
              raw: 1366.2,
            },
            world_heritage_site: {
              raw: 'false',
            },
            date_established: {
              raw: '1964-09-12T05:00:00+00:00',
            },
            image_url: {
              raw:
                'https://storage.googleapis.com/public-demo-assets.swiftype.info/swiftype-dot-com-search-ui-national-parks-demo/9E7FC0DB-1DD8-B71B-0BC3880DC2250415.jpg',
            },
            description: {
              raw:
                'This landscape was eroded into a maze of canyons, buttes, and mesas by the combined efforts of the Colorado River, Green River, and their tributaries, which divide the park into three districts. The park also contains rock pinnacles and arches, as well as artifacts from Ancient Pueblo peoples.',
            },
            location: {
              raw: '38.2,-109.93',
            },
            acres: {
              raw: '337597.83',
            },
            title: {
              raw: 'Canyonlands',
            },
            nps_link: {
              raw: 'https://www.nps.gov/cany/index.htm',
            },
            states: {
              raw: ['Utah'],
            },
            id: {
              raw: 'park_canyonlands',
            },
          },
          null,
          2
        )}
      </EuiCodeBlock>
    </EuiPanel>
  );
};
