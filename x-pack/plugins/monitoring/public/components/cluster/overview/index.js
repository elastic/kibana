/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { ElasticsearchPanel } from './elasticsearch_panel';
import { KibanaPanel } from './kibana_panel';
import { LogstashPanel } from './logstash_panel';
import { BeatsPanel } from './beats_panel';
import { EuiPage, EuiPageBody, EuiScreenReaderOnly } from '@elastic/eui';
import { ApmPanel } from './apm_panel';
import { FormattedMessage } from '@kbn/i18n/react';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../../../common/constants';

export function Overview(props) {
  const isFromStandaloneCluster = props.cluster.cluster_uuid === STANDALONE_CLUSTER_CLUSTER_UUID;
  return (
    <EuiPage>
      <EuiPageBody>
        <EuiScreenReaderOnly>
          <h1>
            <FormattedMessage
              id="xpack.monitoring.overview.heading"
              defaultMessage="Stack Monitoring Overview"
            />
          </h1>
        </EuiScreenReaderOnly>

        {!isFromStandaloneCluster ? (
          <Fragment>
            <ElasticsearchPanel
              {...props.cluster.elasticsearch}
              version={props.cluster.version}
              ml={props.cluster.ml}
              license={props.cluster.license}
              setupMode={props.setupMode}
              showLicenseExpiration={props.showLicenseExpiration}
              alerts={props.alerts}
            />
            <KibanaPanel
              {...props.cluster.kibana}
              setupMode={props.setupMode}
              alerts={props.alerts}
            />
          </Fragment>
        ) : null}

        <LogstashPanel
          {...props.cluster.logstash}
          setupMode={props.setupMode}
          alerts={props.alerts}
        />

        <BeatsPanel {...props.cluster.beats} setupMode={props.setupMode} />

        <ApmPanel {...props.cluster.apm} setupMode={props.setupMode} />
      </EuiPageBody>
    </EuiPage>
  );
}
