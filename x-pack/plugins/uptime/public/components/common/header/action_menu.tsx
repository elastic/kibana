/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import {
  createExploratoryViewUrl,
  HeaderMenuPortal,
  SeriesUrl,
} from '../../../../../observability/public';
import { AppMountParameters } from '../../../../../../../src/core/public';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';
import { useGetUrlParams } from '../../../hooks';

const ADD_DATA_LABEL = i18n.translate('xpack.uptime.addDataButtonLabel', {
  defaultMessage: 'Add data',
});

const ANALYZE_DATA = i18n.translate('xpack.uptime.analyzeDataButtonLabel', {
  defaultMessage: 'Analyze data',
});

const ANALYZE_MESSAGE = i18n.translate('xpack.uptime.analyzeDataButtonLabel.message', {
  defaultMessage:
    'EXPERIMENTAL - Analyze Data allows you to select and filter result data in any dimension and look for the cause or impact of performance problems.',
});

export const ActionMenu = ({ appMountParameters }: { appMountParameters: AppMountParameters }) => {
  const kibana = useKibana();
  const { basePath } = useUptimeSettingsContext();
  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  const syntheticExploratoryViewLink = createExploratoryViewUrl(
    {
      'synthetics-series': {
        dataType: 'synthetics',
        time: { from: dateRangeStart, to: dateRangeEnd },
      } as SeriesUrl,
    },
    basePath
  );

  return (
    <HeaderMenuPortal setHeaderActionMenu={appMountParameters.setHeaderActionMenu}>
      <EuiFlexGroup alignItems="flexEnd" responsive={false} style={{ paddingRight: 20 }}>
        <EuiFlexItem>
          <EuiToolTip position="top" content={<p>{ANALYZE_MESSAGE}</p>}>
            <EuiButtonEmpty
              href={syntheticExploratoryViewLink}
              color="primary"
              iconType="visBarVerticalStacked"
            >
              {ANALYZE_DATA}
            </EuiButtonEmpty>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            href={kibana.services?.application?.getUrlForApp('/home#/tutorial/uptimeMonitors')}
            color="primary"
            iconType="indexOpen"
          >
            {ADD_DATA_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </HeaderMenuPortal>
  );
};
