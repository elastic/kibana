/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { STATUS } from '../../../constants';
import { isEmpty } from 'lodash';
import { loadAgentStatus } from '../../../services/rest';
import { KibanaLink } from '../../../utils/url';
import { EuiButton } from '@elastic/eui';
import List from './List';
import { HeaderContainer } from '../../shared/UIComponents';
import { KueryBar } from '../../shared/KueryBar';

import { ServiceListRequest } from '../../../store/reactReduxRequest/serviceList';

class ServiceOverview extends Component {
  state = {
    noHistoricalDataFound: false
  };

  async checkForHistoricalData({ serviceList }) {
    if (serviceList.status === STATUS.SUCCESS && isEmpty(serviceList.data)) {
      const result = await loadAgentStatus();
      if (!result.dataFound) {
        this.setState({ noHistoricalDataFound: true });
      }
    }
  }

  componentDidMount() {
    this.checkForHistoricalData(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.checkForHistoricalData(nextProps);
  }

  render() {
    const { changeServiceSorting, serviceSorting, urlParams } = this.props;
    const { noHistoricalDataFound } = this.state;

    const emptyMessageHeading = noHistoricalDataFound
      ? "Looks like you don't have any services with APM installed. Let's add some!"
      : 'No services with data in the selected time range.';

    const emptyMessageSubHeading = noHistoricalDataFound ? (
      <SetupInstructionsLink buttonFill />
    ) : null;

    return (
      <div>
        <HeaderContainer>
          <h1>Services</h1>
          <SetupInstructionsLink />
        </HeaderContainer>

        <KueryBar />

        <ServiceListRequest
          urlParams={urlParams}
          render={({ data }) => (
            <List
              items={data}
              changeServiceSorting={changeServiceSorting}
              serviceSorting={serviceSorting}
              emptyMessageHeading={emptyMessageHeading}
              emptyMessageSubHeading={emptyMessageSubHeading}
            />
          )}
        />
      </div>
    );
  }
}

function SetupInstructionsLink({ buttonFill = false }) {
  return (
    <KibanaLink pathname={'/app/kibana'} hash={'/home/tutorial/apm'} query={{}}>
      <EuiButton size="s" color="primary" fill={buttonFill}>
        Setup Instructions
      </EuiButton>
    </KibanaLink>
  );
}

export default ServiceOverview;
