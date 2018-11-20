/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent } from 'react';
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
<<<<<<< HEAD

export class CcrShard extends PureComponent {
=======
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

class CcrShardUI extends PureComponent {
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  renderCharts() {
    const { metrics } = this.props;
    const seriesToShow = [
      metrics.ccr_sync_lag_ops,
      metrics.ccr_sync_lag_time
    ];

    const charts = seriesToShow.map((data, index) => (
      <EuiFlexItem style={{ minWidth: '45%' }} key={index}>
        <EuiPanel>
          <MonitoringTimeseriesContainer
            series={data}
          />
        </EuiPanel>
      </EuiFlexItem>
    ));

    return (
      <Fragment>
        {charts}
      </Fragment>
    );
  }

  renderErrors() {
<<<<<<< HEAD
    const { stat } = this.props;
=======
    const { stat, intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    if (stat.read_exceptions && stat.read_exceptions.length > 0) {
      return (
        <Fragment>
          <EuiPanel>
            <EuiTitle size="s" color="danger">
              <h3>
<<<<<<< HEAD
                <EuiTextColor color="danger">Errors</EuiTextColor>
=======
                <EuiTextColor color="danger">
                  <FormattedMessage
                    id="xpack.monitoring.elasticsearch.ccrShard.errorsTableTitle"
                    defaultMessage="Errors"
                  />
                </EuiTextColor>
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
              </h3>
            </EuiTitle>
            <EuiSpacer size="s"/>
            <EuiBasicTable
              items={stat.read_exceptions}
              columns={[
                {
<<<<<<< HEAD
                  name: 'Type',
                  field: 'exception.type'
                },
                {
                  name: 'Reason',
=======
                  name: intl.formatMessage({
                    id: 'xpack.monitoring.elasticsearch.ccrShard.errorsTable.typeColumnTitle',
                    defaultMessage: 'Type'
                  }),
                  field: 'exception.type'
                },
                {
                  name: intl.formatMessage({
                    id: 'xpack.monitoring.elasticsearch.ccrShard.errorsTable.reasonColumnTitle',
                    defaultMessage: 'Reason'
                  }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
                  field: 'exception.reason',
                  width: '75%'
                }
              ]}
            />
          </EuiPanel>
          <EuiHorizontalRule/>
        </Fragment>
      );
    }
    return null;
  }

  renderLatestStat() {
    const { stat, timestamp } = this.props;

    return (
      <EuiAccordion
        id="ccrLatestStat"
<<<<<<< HEAD
        buttonContent={<EuiTitle><h2>Advanced</h2></EuiTitle>}
=======
        buttonContent={(
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.monitoring.elasticsearch.ccrShard.latestStateAdvancedButtonLabel"
                defaultMessage="Advanced"
              />
            </h2>
          </EuiTitle>
        )}
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        paddingSize="l"
      >
        <Fragment>
          <EuiTitle size="s">
            <h4>{formatDateTimeLocal(timestamp)}</h4>
          </EuiTitle>
          <EuiHorizontalRule/>
          <EuiCodeBlock language="json">
            {JSON.stringify(stat, null, 2)}
          </EuiCodeBlock>
        </Fragment>
      </EuiAccordion>
    );
  }

  render() {
    const { stat, oldestStat, formattedLeader } = this.props;

    return (
      <EuiPage style={{ backgroundColor: 'white' }}>
        <EuiPageBody>
          <Status stat={stat} formattedLeader={formattedLeader} oldestStat={oldestStat}/>
          <EuiSpacer size="s"/>
          {this.renderErrors()}
          <EuiFlexGroup wrap>
            {this.renderCharts()}
          </EuiFlexGroup>
          <EuiHorizontalRule/>
          {this.renderLatestStat()}
        </EuiPageBody>
      </EuiPage>
    );
  }
}
<<<<<<< HEAD
=======

export const CcrShard = injectI18n(CcrShardUI);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
