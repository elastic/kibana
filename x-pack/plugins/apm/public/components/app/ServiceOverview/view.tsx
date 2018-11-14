/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { Component } from 'react';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { loadAgentStatus } from '../../../services/rest/apm';
import { ServiceListRequest } from '../../../store/reactReduxRequest/serviceList';
import { EmptyMessage } from '../../shared/EmptyMessage';
import { SetupInstructionsLink } from '../../shared/SetupInstructionsLink';
import { IApmService, ServiceList } from './ServiceList';

interface Props {
  urlParams: IUrlParams;
  serviceList: IApmService[];
}

interface State {
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
    const { historicalDataFound } = this.state;

    const noItemsMessage = (
      <EmptyMessage
        heading={
          historicalDataFound
            ? 'No services were found'
            : "Looks like you don't have any services with APM installed. Let's add some!"
        }
        subheading={
          !historicalDataFound ? <SetupInstructionsLink buttonFill /> : null
        }
      />
    );

    // Render method here uses this.props.serviceList instead of received "data" from RRR
    // to make it easier to test -- mapStateToProps uses the RRR selector so the data
    // is the same either way
    return (
      <div>
        <EuiSpacer />
        <ServiceListRequest
          urlParams={urlParams}
          render={() => (
            <ServiceList
              items={this.props.serviceList}
              noItemsMessage={noItemsMessage}
            />
          )}
        />
      </div>
    );
  }
}
