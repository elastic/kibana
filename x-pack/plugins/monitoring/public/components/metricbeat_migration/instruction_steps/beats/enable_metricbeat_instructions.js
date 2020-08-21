/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { EuiSpacer, EuiCodeBlock, EuiLink, EuiCallOut, EuiText } from '@elastic/eui';
import { Monospace } from '../components/monospace';
import { FormattedMessage } from '@kbn/i18n/react';
import { UNDETECTED_BEAT_TYPE, DEFAULT_BEAT_FOR_URLS } from './common_beats_instructions';
import { Legacy } from '../../../../legacy_shims';
import { getMigrationStatusStep, getSecurityStep } from '../common_instructions';

export function getBeatsInstructionsForEnablingMetricbeat(product, _meta, { esMonitoringUrl }) {
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = Legacy.shims.docLinks;
  const beatType = product.beatType;
  const securitySetup = getSecurityStep(
    `${ELASTIC_WEBSITE_URL}guide/en/beats/metricbeat/${DOC_LINK_VERSION}/configuring-howto-metricbeat.html`
  );

  const installMetricbeatStep = {
    title: i18n.translate(
      'xpack.monitoring.metricbeatMigration.beatsInstructions.installMetricbeatTitle',
      {
        defaultMessage: 'Install Metricbeat on the same server as this {beatType}',
        values: {
          beatType: beatType || UNDETECTED_BEAT_TYPE,
        },
      }
    ),
    children: (
      <EuiText>
        <p>
          <EuiLink
            href={`${ELASTIC_WEBSITE_URL}guide/en/beats/metricbeat/${DOC_LINK_VERSION}/metricbeat-installation-configuration.html`}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.beatsInstructions.installMetricbeatLinkText"
              defaultMessage="Follow the instructions here."
            />
          </EuiLink>
        </p>
      </EuiText>
    ),
  };

  const httpEndpointUrl =
    `${ELASTIC_WEBSITE_URL}guide/en/beats/${beatType || DEFAULT_BEAT_FOR_URLS}` +
    `/${DOC_LINK_VERSION}/http-endpoint.html`;

  const enableMetricbeatModuleStep = {
    title: i18n.translate(
      'xpack.monitoring.metricbeatMigration.beatsInstructions.enableMetricbeatModuleTitle',
      {
        defaultMessage: 'Enable and configure the Beat x-pack module in Metricbeat',
      }
    ),
    children: (
      <Fragment>
        <EuiCodeBlock isCopyable language="bash">
          metricbeat modules enable beat-xpack
        </EuiCodeBlock>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.beatsInstructions.enableMetricbeatModuleDescription"
              defaultMessage="By default the module will collect {beatType} monitoring metrics from http://localhost:5066. If the {beatType} instance being monitored has a different address, you must specify it via the {hosts} setting in the {file} file."
              values={{
                hosts: <Monospace>hosts</Monospace>,
                file: <Monospace>modules.d/beat-xpack.yml</Monospace>,
                beatType: beatType || UNDETECTED_BEAT_TYPE,
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCallOut
          color="warning"
          iconType="help"
          title={
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.monitoring.metricbeatMigration.beatsInstructions.enableMetricbeatModuleHttpEnabledDirections"
                  defaultMessage="In order for Metricbeat to collect metrics from the running {beatType}, you need to {link}."
                  values={{
                    link: (
                      <EuiLink href={httpEndpointUrl} target="_blank">
                        <FormattedMessage
                          id="xpack.monitoring.metricbeatMigration.beatsInstructions.enableMetricbeatModuleHttpEnabledDirectionsLinkText"
                          defaultMessage="enable an HTTP endpoint for the {beatType} instance being monitored"
                          values={{
                            beatType,
                          }}
                        />
                      </EuiLink>
                    ),
                    beatType: beatType || UNDETECTED_BEAT_TYPE,
                  }}
                />
              </p>
            </EuiText>
          }
        />
        {securitySetup}
      </Fragment>
    ),
  };

  const configureMetricbeatStep = {
    title: i18n.translate(
      'xpack.monitoring.metricbeatMigration.beatsInstructions.configureMetricbeatTitle',
      {
        defaultMessage: 'Configure Metricbeat to send to the monitoring cluster',
      }
    ),
    children: (
      <Fragment>
        <EuiText>
          <FormattedMessage
            id="xpack.monitoring.metricbeatMigration.beatsInstructions.configureMetricbeatDescription"
            defaultMessage="Make these changes in your {file}."
            values={{
              file: <Monospace>metricbeat.yml</Monospace>,
            }}
          />
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock isCopyable>
          {`output.elasticsearch:
  hosts: [${esMonitoringUrl}] ## Monitoring cluster

  # Optional protocol and basic auth credentials.
  #protocol: "https"
  #username: "elastic"
  #password: "changeme"
`}
        </EuiCodeBlock>
        {securitySetup}
      </Fragment>
    ),
  };

  const startMetricbeatStep = {
    title: i18n.translate(
      'xpack.monitoring.metricbeatMigration.beatsInstructions.startMetricbeatTitle',
      {
        defaultMessage: 'Start Metricbeat',
      }
    ),
    children: (
      <EuiText>
        <p>
          <EuiLink
            href={`${ELASTIC_WEBSITE_URL}guide/en/beats/metricbeat/${DOC_LINK_VERSION}/metricbeat-starting.html`}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.beatsInstructions.startMetricbeatLinkText"
              defaultMessage="Follow the instructions here."
            />
          </EuiLink>
        </p>
      </EuiText>
    ),
  };

  const migrationStatusStep = getMigrationStatusStep(product);

  return [
    installMetricbeatStep,
    enableMetricbeatModuleStep,
    configureMetricbeatStep,
    startMetricbeatStep,
    migrationStatusStep,
  ];
}
