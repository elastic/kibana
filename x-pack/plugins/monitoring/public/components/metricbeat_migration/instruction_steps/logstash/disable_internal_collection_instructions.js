/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { EuiSpacer, EuiCodeBlock, EuiText } from '@elastic/eui';
import { Monospace } from '../components/monospace';
import { FormattedMessage } from '@kbn/i18n/react';
import { getDisableStatusStep } from '../common_instructions';

export function getLogstashInstructionsForDisablingInternalCollection(product, meta) {
  const disableInternalCollectionStep = {
    title: i18n.translate(
      'xpack.monitoring.metricbeatMigration.logstashInstructions.disableInternalCollection.title',
      {
        defaultMessage: 'Disable self monitoring of Logstash monitoring metrics',
      }
    ),
    children: (
      <Fragment>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.logstashInstructions.disableInternalCollection.description"
              defaultMessage="Add the following setting in the Logstash configuration file ({file}):"
              values={{
                file: <Monospace>logstash.yml</Monospace>,
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock isCopyable language="bash">
          xpack.monitoring.enabled: false
        </EuiCodeBlock>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.logstashInstructions.disableInternalCollection.note"
              defaultMessage="You'll need to restart Logstash after making this change."
            />
          </p>
        </EuiText>
      </Fragment>
    ),
  };

  const migrationStatusStep = getDisableStatusStep(product, meta);

  return [disableInternalCollectionStep, migrationStatusStep];
}
