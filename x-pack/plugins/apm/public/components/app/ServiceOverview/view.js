/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { STATUS } from '../../../constants';
import { isEmpty } from 'lodash';
import { loadAgentStatus } from '../../../services/rest/apm';
import { ServiceList } from './ServiceList';
import { EuiSpacer } from '@elastic/eui';
import { ServiceListRequest } from '../../../store/reactReduxRequest/serviceList';
import EmptyMessage from '../../shared/EmptyMessage';
import { SetupInstructionsLink } from '../../shared/SetupInstructionsLink';

export class ServiceOverview extends Component {
  state = {
    historicalDataFound: true
  };

  async checkForHistoricalData({ serviceList }) {
    if (serviceList.status === STATUS.SUCCESS && isEmpty(serviceList.data)) {
      const result = await loadAgentStatus();
      if (!result.dataFound) {
        this.setState({ historicalDataFound: false });
      }
    }
  }

  componentDidMount() {
    this.checkForHistoricalData(this.props);
  }

  componentDidUpdate() {
    // QUESTION: Do we want to check on ANY update, or only if serviceList status/data have changed?
    this.checkForHistoricalData(this.props);
  }

  render() {
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

    return (
      <div>
        <EuiSpacer />
        <ServiceListRequest
          urlParams={urlParams}
          render={({ data }) => (
            <ServiceList items={data} noItemsMessage={noItemsMessage} />
          )}
        />
      </div>
    );
  }
}
