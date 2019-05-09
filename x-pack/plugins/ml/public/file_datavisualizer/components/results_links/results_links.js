/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { FormattedMessage } from '@kbn/i18n/react';
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
import { checkPermission } from '../../../privilege/check_privilege';
import { mlNodesAvailable } from '../../../ml_nodes_check/check_ml_nodes';

const RECHECK_DELAY_MS = 3000;

export class ResultsLinks extends Component {
  constructor(props) {
    super(props);

    this.state = {
      from: 'now-30m',
      to: 'now',
    };

    this.recheckTimeout = null;
    this.showCreateJobLink = true;
  }

  componentDidMount() {
    this.showCreateJobLink = (checkPermission('canCreateJob') && mlNodesAvailable());
    // if this data has a time field,
    // find the start and end times
    if (this.props.timeFieldName !== undefined) {
      this.updateTimeValues();
    }
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
      index,
      indexPatternId,
      timeFieldName,
      createIndexPattern,
    } = this.props;

    const {
      from,
      to,
    } = this.state;

    const _g = (this.props.timeFieldName !== undefined) ? `&_g=(time:(from:'${from}',mode:quick,to:'${to}'))` : '';

    return (
      <EuiFlexGroup gutterSize="l">
        {createIndexPattern &&
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type={`discoverApp`} />}
              title={
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.resultsLinks.viewIndexInDiscoverTitle"
                  defaultMessage="View index in Discover"
                />
              }
              description=""
              href={`${uiChrome.getBasePath()}/app/kibana#/discover?&_a=(index:'${indexPatternId}')${_g}`}
            />
          </EuiFlexItem>
        }

        {(isFullLicense() === true && timeFieldName !== undefined && this.showCreateJobLink && createIndexPattern) &&
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type={`machineLearningApp`} />}
              title={
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.resultsLinks.createNewMLJobTitle"
                  defaultMessage="Create new ML job"
                />
              }
              description=""
              href={`${uiChrome.getBasePath()}/app/ml#/jobs/new_job/step/job_type?index=${indexPatternId}${_g}`}
            />
          </EuiFlexItem>
        }

        {createIndexPattern &&
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xxl" type={`dataVisualizer`} />}
              title={
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.resultsLinks.openInDataVisualizerTitle"
                  defaultMessage="Open in Data Visualizer"
                />
              }
              description=""
              href={`${uiChrome.getBasePath()}/app/ml#/jobs/new_job/datavisualizer?index=${indexPatternId}${_g}`}
            />
          </EuiFlexItem>
        }

        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xxl" type={`managementApp`} />}
            title={
              <FormattedMessage
                id="xpack.ml.fileDatavisualizer.resultsLinks.indexManagementTitle"
                defaultMessage="Index Management"
              />
            }
            description=""
            href={`${uiChrome.getBasePath()}/app/kibana#/management/elasticsearch/index_management/indices/filter/${index}`}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon size="xxl" type={`managementApp`} />}
            title={
              <FormattedMessage
                id="xpack.ml.fileDatavisualizer.resultsLinks.indexPatternManagementTitle"
                defaultMessage="Index Pattern Management"
              />
            }
            description=""
            href={
              `${uiChrome.getBasePath()}/app/kibana#/management/kibana/index_patterns/${(
                createIndexPattern ? indexPatternId : '')}`
            }
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
