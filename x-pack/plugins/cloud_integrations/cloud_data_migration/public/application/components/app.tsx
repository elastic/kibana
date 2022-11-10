/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { CoreStart, CoreTheme } from '@kbn/core/public';

import { css } from '@emotion/react';
import {
  useKibana,
  KibanaThemeProvider,
  KibanaContextProvider,
} from '@kbn/kibana-react-plugin/public';
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
  const {
    services: { uiSettings },
  } = useKibana();
  const isDarkMode = uiSettings?.get('theme:darkMode') || false;
  const { euiTheme } = useEuiTheme();
  const listItemProps = {
    iconType: 'checkInCircleFilled',
    iconProps: { color: 'success' },
    wrapText: true,
  };
  const paddingCss = css`
    padding: calc(${euiTheme.size.base} * 6);
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
        <EuiPanel hasShadow css={paddingCss}>
          <EuiFlexGroup
            className="cloudMigration__panel"
            alignItems="center"
            gutterSize="xl"
            justifyContent="spaceBetween"
          >
            <EuiFlexItem>
              <EuiImage
                alt="Illustration of Elastic data integrations"
                className="cloudMigration__illustration"
                src={
                  `${basePath}/plugins/kibanaReact/assets/` +
                  (isDarkMode
                    ? 'illustration-cloud-migration.svg'
                    : 'illustration-cloud-migration.svg')
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>
                  <FormattedMessage
                    id="cloudMigration.migrateToCloudTitle"
                    defaultMessage="Save time & money by moving your deployment to Elastic Cloud."
                  />
                </h3>
              </EuiTitle>

              <EuiSpacer size="xl" />

              <EuiListGroup maxWidth={700}>
                <EuiListGroupItem
                  {...listItemProps}
                  label={
                    <FormattedMessage
                      id="cloudMigration.deployInSeconds.text"
                      defaultMessage="Deploy in seconds and scale with a click."
                    />
                  }
                />

                <EuiSpacer size="s" />

                <EuiListGroupItem
                  {...listItemProps}
                  label={
                    <FormattedMessage
                      id="cloudMigration.freeUpEngineering.text"
                      defaultMessage="Free up your engineering teams from managing the stack."
                    />
                  }
                />

                <EuiSpacer size="s" />

                <EuiListGroupItem
                  {...listItemProps}
                  label={
                    <FormattedMessage
                      id="cloudMigration.getHelpFromCreators.text"
                      defaultMessage="Get help from the creators of the stack to help you set up your workload, tune for performance, or scale up to petabytes of data."
                    />
                  }
                />

                <EuiSpacer size="s" />

                <EuiListGroupItem
                  {...listItemProps}
                  label={
                    <FormattedMessage
                      id="cloudMigration.getInstantAccess.text"
                      defaultMessage="Get instant access to the latest version of the Elastic Stack with premium features like anomaly detection, searchable snapshots, advanced prevent and protection capabilities, and more."
                    />
                  }
                />
              </EuiListGroup>

              <EuiSpacer size="l" />

              <div>
                {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
                <EuiButton
                  fill={true}
                  fullWidth={false}
                  href={`${basePath}#/cloud_migration`}
                  onClick={() => {
                    console.log('Navigate to info page');
                  }}
                >
                  <FormattedMessage
                    id="cloudMigration.readInstructionsButtonLabel"
                    defaultMessage="Read migration instructions"
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
