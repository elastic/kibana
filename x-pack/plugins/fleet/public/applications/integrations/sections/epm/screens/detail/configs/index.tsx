/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiCodeBlock,
  EuiSpacer,
  EuiSkeletonText,
  EuiCallOut,
  EuiLink,
  EuiCode,
  EuiSteps,
  EuiButtonGroup,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { InstallStatus, type PackageInfo } from '../../../../../types';

import {
  useGetInputsTemplatesQuery,
  useGetPackageInstallStatus,
  useStartServices,
} from '../../../../../hooks';
import { PrereleaseCallout } from '../overview/overview';

import { isPackagePrerelease } from '../../../../../../../../common/services';
import { SideBarColumn } from '../../../components/side_bar_column';
import { InstallButton } from '../settings/install_button';

interface ConfigsProps {
  packageInfo: PackageInfo;
}

export const Configs: React.FC<ConfigsProps> = ({ packageInfo }) => {
  const { docLinks } = useStartServices();
  const { name: pkgName, version: pkgVersion, title: pkgTitle } = packageInfo;
  const notInstalled = packageInfo.status !== 'installing';

  const isPrerelease = isPackagePrerelease(packageInfo.version);
  const {
    data: configs,
    error,
    isLoading,
  } = useGetInputsTemplatesQuery(
    { pkgName, pkgVersion },
    { format: 'yaml', prerelease: isPrerelease }
  );
  const getPackageInstallStatus = useGetPackageInstallStatus();

  const { status: installationStatus, version: installedVersion } = getPackageInstallStatus(
    packageInfo.name
  );

  // for initial value read tab query paramt from url
  const [toggleCompressedIdSelected, setToggleCompressedIdSelected] = React.useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tab') || 'host';
  });

  const config = error ? (
    <EuiFlexItem grow={7}>
      <EuiCallOut
        data-test-subj="configsTab.errorCallout"
        title={
          <FormattedMessage
            id="xpack.fleet.epm.InputTemplates.errorTitle"
            defaultMessage="Unsupported"
          />
        }
        color="warning"
        iconType="alert"
      >
        <p>
          <FormattedMessage
            id="xpack.fleet.epm.InputTemplates.error"
            defaultMessage="This integration doesn't support automatic generation of sample configurations."
          />
        </p>
      </EuiCallOut>
    </EuiFlexItem>
  ) : (
    <EuiFlexItem grow={7}>
      {isLoading && !configs ? (
        <EuiSkeletonText lines={10} />
      ) : (
        <>
          {isPrerelease && (
            <>
              <EuiSpacer size="s" />
              <PrereleaseCallout packageName={packageInfo.name} packageTitle={packageInfo.title} />
            </>
          )}
          <div>
            <EuiButtonGroup
              name="coarsness"
              legend="This is a basic group"
              options={[
                {
                  id: 'host',
                  label: 'Elastic Agent on Host',
                },
                {
                  id: 'k8s',
                  label: 'Elastic Agent on Kubernetes',
                },
              ]}
              idSelected={toggleCompressedIdSelected}
              onChange={(id) => setToggleCompressedIdSelected(id)}
              buttonSize="compressed"
            />
          </div>
          <EuiSpacer size="l" />
          {toggleCompressedIdSelected === 'host' ? (
            <>
              <EuiText>
                <p data-test-subj="configsTab.info">
                  <FormattedMessage
                    id="xpack.fleet.epm.InputTemplates.mainText"
                    defaultMessage="View sample configurations for each of the {name} integration's data streams below. Copy/paste this YML into your {elasticAgentYml} file or into a file within your {inputsDir} directory. For more information, see the {userGuideLink}. See the API Reference tab for all available configurations."
                    values={{
                      name: pkgTitle,
                      elasticAgentYml: <EuiCode>elastic-agent.yml</EuiCode>,
                      inputsDir: <EuiCode>inputs.d</EuiCode>,
                      userGuideLink: (
                        <EuiLink
                          href={docLinks.links.fleet.elasticAgentInputConfiguration}
                          external
                          target="_blank"
                        >
                          <FormattedMessage
                            id="xpack.fleet.epm.InputTemplates.guideLink"
                            defaultMessage="Fleet and Elastic Agent Guide"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiCodeBlock
                language="yaml"
                isCopyable={true}
                paddingSize="s"
                overflowHeight={1000}
                data-test-subj="configsTab.codeblock"
              >
                {configs}
              </EuiCodeBlock>
            </>
          ) : (
            <EuiText>
              <EuiCallOut
                data-test-subj="configsTab.notInstalled"
                title={
                  'Hints-based discovery is a beta feature and so on. It also only works for standalone Kubernetes agents.'
                }
                color="warning"
                iconType="warning"
              />
              <p data-test-subj="configsTab.info">
                <FormattedMessage
                  id="xpack.fleet.epm.InputTemplates.mainText"
                  defaultMessage="Tag the relevant containers on your system with co.elastic.hints/* annotations. Make sure you have auto-discovery enabled. For more details, check the {docs}"
                  values={{
                    name: pkgTitle,
                    docs: (
                      <EuiLink
                        href="https://www.elastic.co/guide/en/fleet/current/hints-annotations-autodiscovery.html"
                        external
                        target="_blank"
                      >
                        <FormattedMessage
                          id="xpack.fleet.epm.InputTemplates.guideLink"
                          defaultMessage="docs"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </p>
              <EuiSpacer size="s" />
              <EuiCodeBlock
                language="yaml"
                isCopyable={true}
                paddingSize="s"
                overflowHeight={1000}
                data-test-subj="configsTab.codeblock"
              >
                {`apiVersion: v1
kind: Pod
metadata:
  name: my_pod
  annotations:
    co.elastic.hints/package: ${pkgName}
    # Depending on the package, configure details of metrics collection. For the full list, see https://www.elastic.co/guide/en/fleet/current/hints-annotations-autodiscovery.html
    co.elastic.hints/period: 10s
    co.elastic.hints/username: my_username
    co.elastic.hints/password: my_password
`}
              </EuiCodeBlock>
              <p>
                Not all integrations are supported for hints-based discovery. Check
                <EuiLink
                  href="hthttps://github.com/elastic/elastic-agent/tree/main/deploy/kubernetes/elastic-agent-standalone/templates.dps://www.elastic.co/guide/en/fleet/current/hints-annotations-autodiscovery.html"
                  external
                  target="_blank"
                >
                  https://github.com/elastic/elastic-agent/tree/main/deploy/kubernetes/elastic-agent-standalone/templates.d
                </EuiLink>
                for the full list. For other integrations, you can reroute the logs stream to the
                appopriate dataset:
              </p>
              <EuiCodeBlock
                language="yaml"
                isCopyable={true}
                paddingSize="s"
                overflowHeight={1000}
                data-test-subj="configsTab.codeblock"
              >
                {`apiVersion: v1
kind: Pod
metadata:
  name: my_pod
  annotations:
    elastic.co/dataset: ${pkgName}.log
    elastic.co/namespace: "abc"
`}
              </EuiCodeBlock>
            </EuiText>
          )}
        </>
      )}
    </EuiFlexItem>
  );

  return (
    <EuiFlexGroup
      data-test-subj="epm.Configs"
      alignItems="flexStart"
      style={{
        paddingTop: installationStatus === InstallStatus.notInstalled ? '100px' : undefined,
      }}
    >
      <SideBarColumn grow={1} />
      {installationStatus === InstallStatus.notInstalled ? (
        <>
          <EuiSteps
            steps={[
              {
                title: 'Install integration assets',
                children: (
                  <EuiText>
                    <p>
                      Install this integration to setup Kibana and Elasticsearch assets designed for
                      PostgreSQL data.
                    </p>

                    <InstallButton {...packageInfo} numOfAssets={0} />
                  </EuiText>
                ),
              },
              {
                title: 'Configure your agent',
                children: config,
              },
            ]}
          />
        </>
      ) : (
        config
      )}
    </EuiFlexGroup>
  );
};
