/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiHeaderLinks, EuiHeaderSectionItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useHistory } from 'react-router-dom';
import { createExploratoryViewUrl, SeriesUrl } from '../../../../../observability/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';
import { useGetUrlParams } from '../../../hooks';
import { ToggleAlertFlyoutButton } from '../../overview/alerts/alerts_containers';
import { SETTINGS_ROUTE } from '../../../../common/constants';
import { stringifyUrlParams } from '../../../lib/helper/stringify_url_params';

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

export function ActionMenuContent(): React.ReactElement {
  const kibana = useKibana();
  const { basePath } = useUptimeSettingsContext();
  const params = useGetUrlParams();
  const { dateRangeStart, dateRangeEnd } = params;
  const history = useHistory();

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
    <EuiHeaderLinks gutterSize="xs">
      <EuiHeaderSectionItem>
        <EuiButtonEmpty
          size="xs"
          aria-label={i18n.translate('xpack.uptime.page_header.settingsLink.label', {
            defaultMessage: 'Navigate to the Uptime settings page',
          })}
          color="text"
          data-test-subj="settings-page-link"
          href={history.createHref({
            pathname: SETTINGS_ROUTE,
            search: stringifyUrlParams(params, true),
          })}
        >
          <FormattedMessage id="xpack.uptime.page_header.settingsLink" defaultMessage="Settings" />
        </EuiButtonEmpty>
      </EuiHeaderSectionItem>
      <EuiHeaderSectionItem>
        <ToggleAlertFlyoutButton />
      </EuiHeaderSectionItem>
      <EuiHeaderSectionItem>
        <EuiToolTip position="top" content={<p>{ANALYZE_MESSAGE}</p>}>
          <EuiButtonEmpty
            size="xs"
            aria-label={i18n.translate('xpack.uptime.page_header.analyzeData.label', {
              defaultMessage:
                'Navigate to the "Analyze Data" view to visualize Synthetics/User data',
            })}
            href={syntheticExploratoryViewLink}
            color="text"
            iconType="visBarVerticalStacked"
          >
            {ANALYZE_DATA}
          </EuiButtonEmpty>
        </EuiToolTip>
      </EuiHeaderSectionItem>
      <EuiHeaderSectionItem>
        <EuiButtonEmpty
          aria-label={i18n.translate('xpack.uptime.page_header.addDataLink.label', {
            defaultMessage: 'Navigate to a tutorial about adding Uptime data',
          })}
          href={kibana.services?.application?.getUrlForApp('/home#/tutorial/uptimeMonitors')}
          color="primary"
          iconType="indexOpen"
        >
          {ADD_DATA_LABEL}
        </EuiButtonEmpty>
      </EuiHeaderSectionItem>
    </EuiHeaderLinks>
  );
}
