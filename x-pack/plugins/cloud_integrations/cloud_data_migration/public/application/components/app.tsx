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

import { css } from '@emotion/react';
import { KibanaThemeProvider, KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Observable } from 'rxjs';
import { BreadcrumbService } from '../services/breadcrumbs';

interface CloudDataMigrationAppDeps {
  http: CoreStart['http'];
  breadcrumbService: BreadcrumbService;
  theme$: Observable<CoreTheme>;
}

export const CloudDataMigrationApp = ({
  http,
  breadcrumbService,
  theme$,
}: CloudDataMigrationAppDeps) => {
  const basePath = http.basePath.get() ?? '';
  const { euiTheme } = useEuiTheme();
  const listItemProps = {
    iconType: 'checkInCircleFilled',
    iconProps: { color: 'success' },
    wrapText: true,
  };
  const listItemCss = css`
    font-weight: 300;
  `;
  const panelPaddingCss = css`
    padding: calc(${euiTheme.size.xxxl});
    margin: ${euiTheme.size.l} auto;
    width: 100%;
    max-width: 875px;
  `;

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('home');
  }, [breadcrumbService]);

  return (
    <KibanaThemeProvider theme$={theme$}>
      <KibanaContextProvider
        services={{
          breadcrumbService,
        }}
      >
        <EuiPanel css={panelPaddingCss} color="subdued">
          <EuiFlexGroup
            direction="column"
            alignItems="center"
            gutterSize="xl"
            justifyContent="spaceBetween"
            css={css`
              max-width: 500px;
              margin: 0 auto;
            `}
          >
            <EuiFlexItem>
              <EuiImage
                alt={i18n.translate('cloudMigration.illustration.alt.text', {
                  defaultMessage: 'Illustration for cloud data migration',
                })}
                css={css`
                  max-width: 75%;
                `}
                src={`${basePath}/plugins/kibanaReact/assets/` + 'illustration-cloud-migration.png'}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="cloudMigration.migrateToCloudTitle"
                    defaultMessage="Elastic Cloud helps your data work harder."
                  />
                </h4>
              </EuiTitle>

              <EuiSpacer size="xl" />

              <EuiListGroup maxWidth={700}>
                <EuiListGroupItem
                  {...listItemProps}
                  label={
                    <EuiText css={listItemCss} size="s" color="subdued">
                      <FormattedMessage
                        id="cloudMigration.deployInSeconds.text"
                        defaultMessage="Deploy Elastic quickly and scale up to petabytes of data with a click."
                      />
                    </EuiText>
                  }
                />

                <EuiSpacer size="s" />

                <EuiListGroupItem
                  {...listItemProps}
                  label={
                    <EuiText css={listItemCss} size="s" color="subdued">
                      <FormattedMessage
                        id="cloudMigration.freeUpEngineering.text"
                        defaultMessage="Streamline your Elastic workflow and free up your team. Manage multiple deployments from a single view and centralize your monitoring data."
                      />
                    </EuiText>
                  }
                />

                <EuiSpacer size="s" />

                <EuiListGroupItem
                  {...listItemProps}
                  label={
                    <EuiText css={listItemCss} size="s" color="subdued">
                      <FormattedMessage
                        id="cloudMigration.getHelpFromCreators.text"
                        defaultMessage="Get support from the creators of Elastic to help you ingest all sorts of data and tune your performance."
                      />
                    </EuiText>
                  }
                />

                <EuiSpacer size="s" />

                <EuiListGroupItem
                  {...listItemProps}
                  label={
                    <EuiText css={listItemCss} size="s" color="subdued">
                      <FormattedMessage
                        id="cloudMigration.getInstantAccess.text"
                        defaultMessage="Access the latest version of Elastic with features you want, like anomaly detection, searchable snapshots, advanced security, and so much more."
                      />
                    </EuiText>
                  }
                />
              </EuiListGroup>

              <EuiSpacer size="l" />

              <div>
                <EuiButton fill={true} fullWidth={false} href={`${basePath}#/cloud_migration`}>
                  <FormattedMessage
                    id="cloudMigration.readInstructionsButtonLabel"
                    defaultMessage="Help me move"
                  />
                </EuiButton>
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </KibanaContextProvider>
    </KibanaThemeProvider>
  );
};
