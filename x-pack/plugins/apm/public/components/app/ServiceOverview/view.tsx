/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import React, { Component } from 'react';
import { RRRRenderResponse } from 'react-redux-request';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { IServiceListItem } from 'x-pack/plugins/apm/server/lib/services/get_services';
import { loadAgentStatus } from '../../../services/rest/apm/status_check';
import { ServiceListRequest } from '../../../store/reactReduxRequest/serviceList';
import { NoServicesMessage } from './NoServicesMessage';
import { ServiceList } from './ServiceList';

interface Props {
  urlParams: IUrlParams;
  serviceList: RRRRenderResponse<IServiceListItem[]>;
}

interface State {
  // any data submitted from APM agents found (not just in the given time range)
  historicalDataFound: boolean;
}

export class ServiceOverview extends Component<Props, State> {
  public state = { historicalDataFound: true };

  public async checkForHistoricalData() {
    const result = await loadAgentStatus();
    this.setState({ historicalDataFound: result.dataFound });
  }

  public componentDidMount() {
    this.checkForHistoricalData();
  }

  public render() {
    const { urlParams } = this.props;

    // Render method here uses this.props.serviceList instead of received "data" from RRR
    // to make it easier to test -- mapStateToProps uses the RRR selector so the data
    // is the same either way
    return (
      <EuiPanel>
        <ServiceListRequest
          urlParams={urlParams}
          render={() => (
            <ServiceList
              items={this.props.serviceList.data}
              noItemsMessage={
                <NoServicesMessage
                  historicalDataFound={this.state.historicalDataFound}
                />
              }
            />
          )}
        />
      </EuiPanel>
    );
  }
}
