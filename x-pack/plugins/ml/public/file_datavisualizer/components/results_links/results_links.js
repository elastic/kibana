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
import { isFullLicense } from '../../../license/check_license';

const RECHECK_DELAY_MS = 3000;

export class ResultsLinks extends Component {
  constructor(props) {
    super(props);

    this.state = {
      from: 'now-30m',
      to: 'now',
    };

    this.recheckTimeout = null;
  }

  componentDidMount() {
    this.updateTimeValues();
  }

  componentWillUnmount() {
    clearTimeout(this.recheckTimeout);
  }

  async updateTimeValues(recheck = true) {
    const {
      index,
      timeFieldName,
    } = this.props;

    const { from, to, } = await getFullTimeRange(index, timeFieldName);
    this.setState({
      from: (from === null) ? this.state.from : from,
      to: (to === null) ? this.state.to : to,
    });

    // these links may have been drawn too quickly for the index to be ready
    // to give us the correct start and end times.
    // especially if the data was small.
    // so if the start and end were null, try again in 3s
    // the timeout is cleared when this component unmounts. just in case the user
    // resets the form or navigates away within 3s
    if (recheck && (from === null || to === null)) {
      this.recheckTimeout = setTimeout(() => {
        this.updateTimeValues(false);
      }, RECHECK_DELAY_MS);
    }
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

        {(isFullLicense() === true) &&
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type={`machineLearningApp`} />}
              title="Create new ML job"
              description=""
              href={`${uiChrome.getBasePath()}/app/ml#/jobs/new_job/step/job_type?index=${indexPatternId}${_g}`}
            />
          </EuiFlexItem>
        }

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
