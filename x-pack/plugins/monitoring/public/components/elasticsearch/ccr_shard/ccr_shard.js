/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, PureComponent } from 'react';
import { Legacy } from '../../../legacy_shims';
import {
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiBasicTable,
  EuiCodeBlock,
  EuiTextColor,
  EuiHorizontalRule,
  EuiAccordion,
} from '@elastic/eui';
import { MonitoringTimeseriesContainer } from '../../chart';
import { Status } from './status';
import { formatDateTimeLocal } from '../../../../common/formatting';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AlertsCallout } from '../../../alerts/callout';

export class CcrShard extends PureComponent {
  renderCharts() {
    const { metrics } = this.props;
    const seriesToShow = [metrics.ccr_sync_lag_ops, metrics.ccr_sync_lag_time];

    const charts = seriesToShow.map((data, index) => (
      <EuiFlexItem style={{ minWidth: '45%' }} key={index}>
        <EuiPanel>
          <MonitoringTimeseriesContainer series={data} />
        </EuiPanel>
      </EuiFlexItem>
    ));

    return <Fragment>{charts}</Fragment>;
  }

  renderErrors() {
    const { stat } = this.props;
    if (stat.read_exceptions && stat.read_exceptions.length > 0) {
      return (
        <Fragment>
          <EuiPanel>
            <EuiTitle size="s" color="danger">
              <h3>
                <EuiTextColor color="danger">
                  <FormattedMessage
                    id="xpack.monitoring.elasticsearch.ccrShard.errorsTableTitle"
                    defaultMessage="Errors"
                  />
                </EuiTextColor>
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiBasicTable
              items={stat.read_exceptions}
              columns={[
                {
                  name: i18n.translate(
                    'xpack.monitoring.elasticsearch.ccrShard.errorsTable.typeColumnTitle',
                    {
                      defaultMessage: 'Type',
                    }
                  ),
                  field: 'exception.type',
                },
                {
                  name: i18n.translate(
                    'xpack.monitoring.elasticsearch.ccrShard.errorsTable.reasonColumnTitle',
                    {
                      defaultMessage: 'Reason',
                    }
                  ),
                  field: 'exception.reason',
                  width: '75%',
                },
              ]}
            />
          </EuiPanel>
          <EuiHorizontalRule />
        </Fragment>
      );
    }
    return null;
  }

  renderLatestStat() {
    const { stat, timestamp } = this.props;
    const injector = Legacy.shims.getAngularInjector();
    const timezone = injector.get('config').get('dateFormat:tz');

    return (
      <EuiAccordion
        id="ccrLatestStat"
        buttonContent={
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.monitoring.elasticsearch.ccrShard.latestStateAdvancedButtonLabel"
                defaultMessage="Advanced"
              />
            </h2>
          </EuiTitle>
        }
        paddingSize="l"
      >
        <Fragment>
          <EuiTitle size="s">
            <h2>{formatDateTimeLocal(timestamp, timezone)}</h2>
          </EuiTitle>
          <EuiHorizontalRule />
          <EuiCodeBlock language="json">{JSON.stringify(stat, null, 2)}</EuiCodeBlock>
        </Fragment>
      </EuiAccordion>
    );
  }

  render() {
    const { stat, oldestStat, formattedLeader, alerts } = this.props;

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPanel>
            <Status
              stat={stat}
              formattedLeader={formattedLeader}
              oldestStat={oldestStat}
              alerts={alerts}
            />
          </EuiPanel>
          <EuiSpacer size="m" />
          <AlertsCallout alerts={alerts} />
          <EuiSpacer size="m" />
          {this.renderErrors()}
          <EuiFlexGroup wrap>{this.renderCharts()}</EuiFlexGroup>
          <EuiHorizontalRule />
          {this.renderLatestStat()}
        </EuiPageBody>
      </EuiPage>
    );
  }
}
