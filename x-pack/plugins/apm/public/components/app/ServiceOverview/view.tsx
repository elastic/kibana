/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { Component } from 'react';
import { RRRRenderResponse } from 'react-redux-request';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { IServiceListItem } from 'x-pack/plugins/apm/server/lib/services/get_services';
import { loadAgentStatus } from '../../../services/rest/apm/status_check';
import { ServiceListRequest } from '../../../store/reactReduxRequest/serviceList';
import { EmptyMessage } from '../../shared/EmptyMessage';
import { SetupInstructionsLink } from '../../shared/SetupInstructionsLink';
import { ServiceList } from './ServiceList';

interface Props {
  urlParams: IUrlParams;
  serviceList: RRRRenderResponse<IServiceListItem[]>;
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
            ? i18n.translate('xpack.apm.servicesTable.notFoundLabel', {
                defaultMessage: 'No services were found'
              })
            : i18n.translate('xpack.apm.servicesTable.noServicesLabel', {
                defaultMessage: `Looks like you don't have any services with APM installed. Let's add some!`
              })
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
        <ServiceListRequest
          urlParams={urlParams}
          render={() => (
            <ServiceList
              items={this.props.serviceList.data}
              noItemsMessage={noItemsMessage}
            />
          )}
        />
      </div>
    );
  }
}
