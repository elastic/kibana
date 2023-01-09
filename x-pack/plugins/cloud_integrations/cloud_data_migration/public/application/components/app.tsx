/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { CoreStart, CoreTheme } from '@kbn/core/public';

import { Observable } from 'rxjs';
import { METRIC_TYPE } from '@kbn/analytics';
import { getServices } from '@kbn/home-plugin/public/application/kibana_services';
import { getAppStyles } from '../../app.styles';
import { BreadcrumbService } from '../services/breadcrumbs';

interface CloudDataMigrationAppDeps {
  http: CoreStart['http'];
  breadcrumbService: BreadcrumbService;
  theme$: Observable<CoreTheme>;
}

export const CloudDataMigrationApp = ({ http, breadcrumbService }: CloudDataMigrationAppDeps) => {
  const basePath = http.basePath.get() ?? '';
  const { euiTheme } = useEuiTheme();
  const listItemProps = {
    iconType: 'checkInCircleFilled',
    iconProps: { color: 'success' },
    wrapText: true,
  };
  const styles = getAppStyles(euiTheme);
  const { trackUiMetric } = getServices();

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('home');
  }, [breadcrumbService]);

  return (
    <EuiPanel css={styles.panelCss} color="subdued">
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        gutterSize="xl"
        justifyContent="spaceBetween"
        css={styles.layoutCss}
      >
        <EuiFlexItem>
          <EuiImage
            alt={i18n.translate('xpack.cloudDataMigration.illustration.alt.text', {
              defaultMessage: 'Illustration for cloud data migration',
            })}
            css={styles.illustrationCss}
            src={`${basePath}/plugins/kibanaReact/assets/` + 'illustration_cloud_migration.png'}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h1>
              <FormattedMessage
                id="xpack.cloudDataMigration.migrateToCloudTitle"
                defaultMessage="Elastic Cloud helps your data work harder."
              />
            </h1>
          </EuiTitle>

          <EuiSpacer size="xl" />

          <EuiListGroup maxWidth={700}>
            <EuiListGroupItem
              {...listItemProps}
              label={
                <EuiText css={styles.listItemCss} size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.cloudDataMigration.deployInSeconds.text"
                    defaultMessage="Deploy Elastic quickly and scale up to petabytes of data with a click."
                  />
                </EuiText>
              }
            />

            <EuiListGroupItem
              {...listItemProps}
              label={
                <EuiText css={styles.listItemCss} size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.cloudDataMigration.freeUpEngineering.text"
                    defaultMessage="Streamline your Elastic workflow and free up your team. Manage multiple deployments from a single view and centralize your monitoring data."
                  />
                </EuiText>
              }
            />

            <EuiListGroupItem
              {...listItemProps}
              label={
                <EuiText css={styles.listItemCss} size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.cloudDataMigration.getHelpFromCreators.text"
                    defaultMessage="Get support from the creators of Elastic to help you ingest all sorts of data and tune your performance."
                  />
                </EuiText>
              }
            />

            <EuiListGroupItem
              {...listItemProps}
              label={
                <EuiText css={styles.listItemCss} size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.cloudDataMigration.getInstantAccess.text"
                    defaultMessage="Access the latest version of Elastic with features you want, like anomaly detection, searchable snapshots, advanced security, and so much more."
                  />
                </EuiText>
              }
            />
          </EuiListGroup>

          <EuiSpacer size="l" />

          <div>
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiButton
              fill={true}
              target="_blank"
              href="https://ela.st/cloud-migration"
              onClick={() => {
                trackUiMetric(METRIC_TYPE.CLICK, 'migrate_data_to_cloud__stack_management_link');
              }}
            >
              <FormattedMessage
                id="xpack.cloudDataMigration.readInstructionsButtonLabel"
                defaultMessage="Help me move"
              />
            </EuiButton>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
