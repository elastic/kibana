/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';

import {
  EuiPageHeader,
  EuiButtonEmpty,
  EuiSpacer,
  EuiPageBody,
  EuiPageContentBody,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import { FormattedMessage } from '@kbn/i18n-react';

import { useAppContext } from '../../app_context';
import { uiMetricService, UIM_ES_DEPRECATION_LOGS_PAGE_LOAD } from '../../lib/ui_metric';
import { FixDeprecationLogs } from './fix_deprecation_logs';

export const EsDeprecationLogs: FunctionComponent = () => {
  const {
    services: {
      breadcrumbs,
      core: { docLinks },
    },
  } = useAppContext();

  useEffect(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.LOADED, UIM_ES_DEPRECATION_LOGS_PAGE_LOAD);
  }, []);

  useEffect(() => {
    breadcrumbs.setBreadcrumbs('esDeprecationLogs');
  }, [breadcrumbs]);

  return (
    <EuiPageBody restrictWidth={true} data-test-subj="esDeprecationLogs">
      <EuiPageContentBody color="transparent" paddingSize="none">
        <EuiPageHeader
          bottomBorder
          pageTitle={i18n.translate('xpack.upgradeAssistant.esDeprecationLogs.pageTitle', {
            defaultMessage: 'Elasticsearch deprecation logs',
          })}
          description={i18n.translate('xpack.upgradeAssistant.esDeprecationLogs.pageDescription', {
            defaultMessage:
              'Review the deprecation logs to determine if your applications are using any deprecated APIs. Update your applications to prevent errors or changes in behavior after you upgrade.',
          })}
          rightSideItems={[
            <EuiButtonEmpty
              href={docLinks.links.elasticsearch.migrationApiDeprecation}
              target="_blank"
              iconType="help"
              data-test-subj="documentationLink"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.esDeprecationLogs.documentationLinkText"
                defaultMessage="Documentation"
              />
            </EuiButtonEmpty>,
          ]}
        />

        <EuiSpacer size="l" />

        <FixDeprecationLogs />
      </EuiPageContentBody>
    </EuiPageBody>
  );
};
