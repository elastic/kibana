/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getAppSearchUrl } from '../../../../shared/enterprise_search_url';
import { TelemetryLogic } from '../../../../shared/telemetry';

export const LaunchAppSearchButton: React.FC = () => {
  const { sendAppSearchTelemetry } = useActions(TelemetryLogic);

  return (
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
    </EuiButton>
  );
};
