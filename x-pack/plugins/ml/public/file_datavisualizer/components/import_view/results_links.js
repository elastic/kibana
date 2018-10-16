/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
} from '@elastic/eui';

import moment from 'moment';
import uiChrome from 'ui/chrome';
import { ml } from '../../../services/ml_api_service';

export class ResultsLinks extends Component {
  constructor(props) {
    super(props);

    this.state = {
      from: 'now-30m',
      to: 'now',
    };
  }

  componentDidMount() {
    this.updateTimeValues();
  }

  async updateTimeValues() {
    const {
      index,
      timeFieldName,
    } = this.props;

    const { from, to, } = await getFullTimeRange(index, timeFieldName);
    this.setState({
      from: (from === null) ? this.state.from : from,
      to: (to === null) ? this.state.to : to,
    });
  }

  render() {
    const {
      indexPatternId,
    } = this.props;

    const {
      from,
      to,
    } = this.state;

    const _g = `&_g=(time:(from:'${from}',mode:quick,to:'${to}'))`;

    return (
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xxl" type={`discoverApp`} />}
            title="View index in Discover"
            description=""
            href={`${uiChrome.getBasePath()}/app/kibana#/discover?&_a=(index:'${indexPatternId}')${_g}`}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xxl" type={`machineLearningApp`} />}
            title="Create new ML job"
            description=""
            href={`${uiChrome.getBasePath()}/app/ml#/jobs/new_job/step/job_type?index=${indexPatternId}${_g}`}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xxl" type={`dataVisualizer`} />}
            title="Open in Data Visualizer"
            description=""
            href={`${uiChrome.getBasePath()}/app/ml#/jobs/new_job/datavisualizer?index=${indexPatternId}${_g}`}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xxl" type={`managementApp`} />}
            title="Index Management"
            description=""
            href={`${uiChrome.getBasePath()}/app/kibana#/management/elasticsearch/index_management/home`}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xxl" type={`managementApp`} />}
            title="Index Pattern Management"
            description=""
            href={`${uiChrome.getBasePath()}/app/kibana#/management/kibana/indices/${indexPatternId}`}
          />
        </EuiFlexItem>

      </EuiFlexGroup>
    );
  }
}


async function getFullTimeRange(index, timeFieldName) {
  const query = { bool: { must: [{ query_string: { analyze_wildcard: true, query: '*' } }] } };
  const resp = await ml.getTimeFieldRange({
    index,
    timeFieldName,
    query
  });

  return {
    from: moment(resp.start.epoch).toISOString(),
    to: moment(resp.end.epoch).toISOString(),
  };
}
