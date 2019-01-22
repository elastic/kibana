/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore No typings for EuiSpacer
  EuiSpacer,
  // @ts-ignore No typings for EuiSuperSelect
  EuiSuperSelect,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { getMonitorPageBreadcrumb } from '../breadcrumbs';
import { MonitorCharts } from '../components/queries/monitor_charts';
import { MonitorSelect } from '../components/queries/monitor_select';
import { MonitorStatusBar } from '../components/queries/monitor_status_bar';
import { Pings } from '../components/queries/ping_list';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { UptimeCommonProps } from '../uptime_app';

interface MonitorPageProps {
  updateBreadcrumbs: UMUpdateBreadcrumbs;
  history: { push: any };
  location: { pathname: string };
  match: { params: { id: string } };
}

type Props = MonitorPageProps & UptimeCommonProps;

export class MonitorPage extends React.Component<Props> {
  constructor(props: Props) {
    super(props);
  }

  public componentWillMount() {
    this.props.updateBreadcrumbs(getMonitorPageBreadcrumb());
  }

  public render() {
    const { history } = this.props;
    // TODO: this is a hack because the id field's characters mess up react router's
    // inner params parsing, when we add a synthetic ID for monitors this problem should go away
    const id = this.props.location.pathname.replace(/^(\/monitor\/)/, '');
    return (
      <Fragment>
        <EuiTitle>
          <h2>{id}</h2>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <span>
              <FormattedMessage
                id="xpack.uptime.monitorPage.header.salutation"
                defaultMessage="Monitor:"
              />
            </span>
          </EuiFlexItem>
          <EuiFlexItem>
            <MonitorSelect valueOfSelectedMonitor={id} onChange={history.push} {...this.props} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <MonitorStatusBar monitorId={id} {...this.props} />
        <EuiSpacer />
        <MonitorCharts monitorId={id} {...this.props} />
        <EuiSpacer />
        <Pings monitorId={id} {...this.props} />
      </Fragment>
    );
  }
}
