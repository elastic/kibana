/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import withErrorHandler from '../../shared/withErrorHandler';
import { STATUS } from '../../../constants';
import { isEmpty } from 'lodash';
import { loadAgentStatus } from '../../../services/rest';
import { KibanaLink } from '../../../utils/url';
import { EuiButton } from '@elastic/eui';
import List from './List';
import { getKey } from '../../../store/apiHelpers';
import { HeaderContainer } from '../../shared/UIComponents';

function fetchData(props) {
  const { start, end } = props.urlParams;
  const key = getKey({ start, end });

  if (key && props.serviceList.key !== key) {
    props.loadServiceList({ start, end });
  }
}

class ServiceOverview extends Component {
  state = {
    noHistoricalDataFound: false
  };

  checkForHistoricalData({ serviceList }) {
    if (serviceList.status === STATUS.SUCCESS && isEmpty(serviceList.data)) {
      loadAgentStatus().then(result => {
        if (!result.dataFound) {
          this.setState({ noHistoricalDataFound: true });
        }
      });
    }
  }

  componentDidMount() {
    fetchData(this.props);
    this.checkForHistoricalData(this.props);
  }

  componentWillReceiveProps(nextProps) {
    fetchData(nextProps);
    this.checkForHistoricalData(nextProps);
  }

  render() {
    const { serviceList, changeServiceSorting, serviceSorting } = this.props;
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

        <List
          items={serviceList.data}
          changeServiceSorting={changeServiceSorting}
          serviceSorting={serviceSorting}
          emptyMessageHeading={emptyMessageHeading}
          emptyMessageSubHeading={emptyMessageSubHeading}
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

export default withErrorHandler(ServiceOverview, ['serviceList']);
