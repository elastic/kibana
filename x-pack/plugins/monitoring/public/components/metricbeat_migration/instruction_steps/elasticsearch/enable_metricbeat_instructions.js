/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import {
  EuiSpacer,
  EuiCodeBlock,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCallOut,
  EuiText
} from '@elastic/eui';
import { Monospace } from '../components/monospace';
import { FormattedMessage } from '@kbn/i18n/react';
import { statusTitle } from './common_elasticsearch_instructions';

export function getElasticsearchInstructionsForEnablingMetricbeat(product, _meta, {
  esMonitoringUrl,
  hasCheckedStatus,
  checkingMigrationStatus,
  checkForMigrationStatus,
  autoCheckIntervalInMs
}) {
  const installMetricbeatStep = {
    title: i18n.translate('xpack.monitoring.metricbeatMigration.elasticsearchInstructions.installMetricbeatTitle', {
      defaultMessage: 'Install Metricbeat on the same server as Elasticsearch'
    }),
    children: (
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.monitoring.metricbeatMigration.elasticsearchInstructions.installMetricbeatDescription"
            defaultMessage="Follow {link}."
            values={{
              link: (
                <EuiLink href="https://www.elastic.co/guide/en/beats/metricbeat/current/metricbeat-installation.html" target="_blank">
                  <FormattedMessage
                    id="xpack.monitoring.metricbeatMigration.elasticsearchInstructions.installMetricbeatLinkText"
                    defaultMessage="the instructions here"
                  />
                </EuiLink>
              )
            }}
          />
        </p>
      </EuiText>
    )
  };


  const enableMetricbeatModuleStep = {
    title: i18n.translate('xpack.monitoring.metricbeatMigration.elasticsearchInstructions.enableMetricbeatModuleTitle', {
      defaultMessage: 'Enable and configure the Elasticsearch module in Metricbeat'
    }),
    children: (
      <Fragment>
        <EuiCodeBlock
          isCopyable
          language="bash"
        >
            metricbeat modules enable elasticsearch-xpack
        </EuiCodeBlock>
        <EuiSpacer size="s"/>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.elasticsearchInstructions.enableMetricbeatModuleDescription"
              defaultMessage="By default the module will collect Elasticsearch monitoring metrics from {url}.
              If the local Elasticsearch server has a different address,
              you must specify it via the hosts setting in the {module} file."
              values={{
                module: (
                  <Monospace>modules.d/elasticsearch-xpack.yml</Monospace>
                ),
                url: (
                  <Monospace>http://localhost:9200</Monospace>
                )
              }}
            />
          </p>
        </EuiText>
      </Fragment>
    )
  };

  const configureMetricbeatStep = {
    title: i18n.translate('xpack.monitoring.metricbeatMigration.elasticsearchInstructions.configureMetricbeatTitle', {
      defaultMessage: 'Configure Metricbeat to send to the monitoring cluster'
    }),
    children: (
      <Fragment>
        <EuiCodeBlock
          isCopyable
        >
          {`
output.elasticsearch:
  hosts: ["${esMonitoringUrl}"]
`}
        </EuiCodeBlock>
      </Fragment>

    )
  };

  const startMetricbeatStep = {
    title: i18n.translate('xpack.monitoring.metricbeatMigration.elasticsearchInstructions.startMetricbeatTitle', {
      defaultMessage: 'Start Metricbeat'
    }),
    children: (
      <Fragment>
        <EuiCodeBlock
          isCopyable
        >
          {`
./metricbeat -e
`}
        </EuiCodeBlock>
      </Fragment>

    )
  };

  let migrationStatusStep = null;
  if (product.isInternalCollector) {
    let status = null;
    if (hasCheckedStatus) {
      status = (
        <Fragment>
          <EuiSpacer size="m"/>
          <EuiCallOut
            size="s"
            color="warning"
            title={i18n.translate('xpack.monitoring.metricbeatMigration.elasticsearchInstructions.isInternalCollectorStatusTitle', {
              defaultMessage: `We have not detected any monitoring data coming from Metricbeat for this Elasticsearch.
              We will continously check every {timePeriod} seconds in the background.`,
              values: {
                timePeriod: autoCheckIntervalInMs / 1000,
              }
            })}
          />
        </Fragment>
      );
    }

    let buttonLabel;
    if (checkingMigrationStatus) {
      buttonLabel = i18n.translate('xpack.monitoring.metricbeatMigration.elasticsearchInstructions.checkingStatusButtonLabel', {
        defaultMessage: 'Checking for data...'
      });
    } else {
      buttonLabel = i18n.translate('xpack.monitoring.metricbeatMigration.elasticsearchInstructions.checkStatusButtonLabel', {
        defaultMessage: 'Check for data'
      });
    }

    migrationStatusStep = {
      title: statusTitle,
      status: 'incomplete',
      children: (
        <Fragment>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiText>
                <p>
                  {i18n.translate('xpack.monitoring.metricbeatMigration.elasticsearchInstructions.statusDescription', {
                    defaultMessage: 'Check that data is received from the Metricbeat'
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={checkForMigrationStatus} isDisabled={checkingMigrationStatus}>
                {buttonLabel}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          {status}
        </Fragment>
      )
    };
  }
  else if (product.isPartiallyMigrated || product.isFullyMigrated) {
    migrationStatusStep = {
      title: statusTitle,
      status: 'complete',
      children: (
        <EuiCallOut
          size="s"
          color="success"
          title={i18n.translate('xpack.monitoring.metricbeatMigration.elasticsearchInstructions.fullyMigratedStatusTitle', {
            defaultMessage: 'Congratulations! We are now seeing monitoring data shipping from Metricbeat!'
          })}
        />
      )
    };
  }

  return [
    installMetricbeatStep,
    enableMetricbeatModuleStep,
    configureMetricbeatStep,
    startMetricbeatStep,
    migrationStatusStep
  ];
}
