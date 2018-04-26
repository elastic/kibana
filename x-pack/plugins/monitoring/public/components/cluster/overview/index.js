/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ElasticsearchPanel } from './elasticsearch_panel';
import { KibanaPanel } from './kibana_panel';
import { LogstashPanel } from './logstash_panel';
import { AlertsPanel } from './alerts_panel';
import { BeatsPanel } from './beats_panel';

import { EuiPage } from '@elastic/eui';

export function Overview(props) {
  return (
    <EuiPage>
      <AlertsPanel alerts={props.cluster.alerts} changeUrl={props.changeUrl} />

      <ElasticsearchPanel
        {...props.cluster.elasticsearch}
        ml={props.cluster.ml}
        changeUrl={props.changeUrl}
        license={props.cluster.license}
        showLicenseExpiration={props.showLicenseExpiration}
      />

      <KibanaPanel {...props.cluster.kibana} changeUrl={props.changeUrl} />

      <LogstashPanel {...props.cluster.logstash} changeUrl={props.changeUrl} />

      <BeatsPanel {...props.cluster.beats} changeUrl={props.changeUrl} />
    </EuiPage>
  );
}
