/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiPageHeader, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getAppSearchUrl } from '../../../../shared/enterprise_search_url';
import { SetAppSearchChrome as SetPageChrome } from '../../../../shared/kibana_chrome';
import { TelemetryLogic } from '../../../../shared/telemetry';

import { ENGINES_TITLE } from '../constants';

export const EnginesOverviewHeader: React.FC = () => {
  const { sendAppSearchTelemetry } = useActions(TelemetryLogic);

  return (
    <>
      <SetPageChrome trail={[ENGINES_TITLE]} />
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.enterpriseSearch.appSearch.enginesOverview.title', {
          defaultMessage: 'Engines overview',
        })}
        rightSideItems={[
          // eslint-disable-next-line @elastic/eui/href-or-on-click
          <EuiButton
            size="s"
            iconType="popout"
            href={getAppSearchUrl()}
            target="_blank"
            onClick={() =>
              sendAppSearchTelemetry({
                action: 'clicked',
                metric: 'header_launch_button',
              })
            }
            data-test-subj="launchButton"
          >
            {i18n.translate('xpack.enterpriseSearch.appSearch.productCta', {
              defaultMessage: 'Launch App Search',
            })}
          </EuiButton>,
        ]}
      />
    </>
  );
};
