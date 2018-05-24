/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for displaying details of an anomaly in the expanded row section
 * of the anomalies table.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import _ from 'lodash';

import {
  EuiDescriptionList,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText
} from '@elastic/eui';
import { formatDate } from '@elastic/eui/lib/services/format';

import { EntityCell } from './entity_cell';
import {
  getSeverity,
  showActualForFunction,
  showTypicalForFunction
} from 'plugins/ml/../common/util/anomaly_utils';
import { formatValue } from 'plugins/ml/formatters/format_value';

const TIME_FIELD_NAME = 'timestamp';


function getFilterEntity(entityName, entityValue, filter) {
  return (
    <EntityCell
      entityName={entityName}
      entityValue={entityValue}
      filter={filter}
    />
  );
}

function getDetailsItems(anomaly, examples, filter) {
  const source = anomaly.source;

  // TODO - when multivariate analyses are more common,
  // look in each cause for a 'correlatedByFieldValue' field,
  let causes = [];
  const sourceCauses = source.causes || [];
  let singleCauseByFieldName = undefined;
  let singleCauseByFieldValue = undefined;
  if (sourceCauses.length === 1) {
    // Metrics and probability will already have been placed at the top level.
    // If cause has byFieldValue, move it to a top level fields for display.
    if (sourceCauses[0].by_field_name !== undefined) {
      singleCauseByFieldName = sourceCauses[0].by_field_name;
      singleCauseByFieldValue = sourceCauses[0].by_field_value;
    }
  } else {
    causes = sourceCauses.map((cause) => {
      const simplified = _.pick(cause, 'typical', 'actual', 'probability');
      // Get the 'entity field name/value' to display in the cause -
      // For by and over, use by_field_name/value (over_field_name/value are in the top level fields)
      // For just an 'over' field - the over_field_name/value appear in both top level and cause.
      simplified.entityName = _.has(cause, 'by_field_name') ? cause.by_field_name : cause.over_field_name;
      simplified.entityValue = _.has(cause, 'by_field_value') ? cause.by_field_value : cause.over_field_value;
      return simplified;
    });
  }

  const items = [];
  if (source.partition_field_value !== undefined) {
    items.push({
      title: source.partition_field_name,
      description: getFilterEntity(source.partition_field_name, source.partition_field_value, filter)
    });
  }

  if (source.by_field_value !== undefined) {
    items.push({
      title: source.by_field_name,
      description: getFilterEntity(source.by_field_name, source.by_field_value, filter)
    });
  }

  if (singleCauseByFieldName !== undefined) {
    // Display byField of single cause.
    items.push({
      title: singleCauseByFieldName,
      description: getFilterEntity(singleCauseByFieldName, singleCauseByFieldValue, filter)
    });
  }

  if (source.over_field_value !== undefined) {
    items.push({
      title: source.over_field_name,
      description: getFilterEntity(source.over_field_name, source.over_field_value, filter)
    });
  }

  const anomalyTime = source[TIME_FIELD_NAME];
  let timeDesc = `${formatDate(anomalyTime, 'MMMM Do YYYY, HH:mm:ss')}`;
  if (source.bucket_span !== undefined) {
    const anomalyEndTime = anomalyTime + (source.bucket_span * 1000);
    timeDesc += ` to ${formatDate(anomalyEndTime, 'MMMM Do YYYY, HH:mm:ss')}`;
  }
  items.push({
    title: 'time',
    description: timeDesc
  });

  if (examples !== undefined && examples.length > 0) {
    examples.forEach((example, index) => {
      const title = (index === 0) ? 'category examples' : '';
      items.push({ title, description: example });
    });
  }

  items.push({
    title: 'function',
    description: (source.function !== 'metric') ? source.function : source.function_description
  });

  if (source.field_name !== undefined) {
    items.push({
      title: 'fieldName',
      description: source.field_name
    });
  }

  const functionDescription = source.function_description || '';
  if (anomaly.actual !== undefined && showActualForFunction(functionDescription) === true) {
    items.push({
      title: 'actual',
      description: formatValue(anomaly.actual, source.function)
    });
  }

  if (anomaly.typical !== undefined && showTypicalForFunction(functionDescription) === true) {
    items.push({
      title: 'typical',
      description: formatValue(anomaly.typical, source.function)
    });
  }

  items.push({
    title: 'job ID',
    description: anomaly.jobId
  });

  items.push({
    title: 'probability',
    description: source.probability
  });

  // If there was only one cause, the actual, typical and by_field
  // will already have been added for display.
  if (causes.length > 1) {
    causes.forEach((cause, index) => {
      const title = (index === 0) ? `${cause.entityName} values` : '';
      let description = `${cause.entityValue} (actual ${formatValue(cause.actual, source.function)}, `;
      description += `typical ${formatValue(cause.typical, source.function)}, probability ${cause.probability})`;
      items.push({ title, description });
    });
  }

  return items;
}

export class AnomalyDetails extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showAllInfluencers: false
    };
  }

  toggleAllInfluencers() {
    this.setState({ showAllInfluencers: !this.state.showAllInfluencers });
  }

  renderDescription() {
    const anomaly = this.props.anomaly;
    const source = anomaly.source;

    let anomalyDescription = `${getSeverity(anomaly.severity)} anomaly in ${anomaly.detector}`;
    if (anomaly.entityName !== undefined) {
      anomalyDescription += ` found for ${anomaly.entityName} ${anomaly.entityValue}`;
    }

    if ((source.partition_field_name !== undefined) &&
        (source.partition_field_name !== anomaly.entityName)) {
      anomalyDescription += ` detected in ${source.partition_field_name}`;
      anomalyDescription += ` ${source.partition_field_value}`;
    }

    // Check for a correlatedByFieldValue in the source which will be present for multivariate analyses
    // where the record is anomalous due to relationship with another 'by' field value.
    let mvDescription = undefined;
    if (source.correlated_by_field_value !== undefined) {
      mvDescription = `multivariate correlations found in ${source.by_field_name}; `;
      mvDescription += `${source.by_field_value} is considered anomalous given ${source.correlated_by_field_value}`;
    }
    return (
      <React.Fragment>
        <EuiText size="xs">
          <h5>Description</h5>
          {anomalyDescription}
        </EuiText>
        {(mvDescription !== undefined) &&
          <EuiText size="xs">
            {mvDescription}
          </EuiText>
        }
      </React.Fragment>
    );
  }

  renderDetails() {
    const detailItems = getDetailsItems(this.props.anomaly, this.props.examples, this.props.filter);
    const isInterimResult = _.get(this.props.anomaly, 'source.is_interim', false);
    return (
      <React.Fragment>
        <EuiText>
          {this.props.isAggregatedData === true ? (
            <h5>Details on highest severity anomaly</h5>
          ) : (
            <h5>Anomaly details</h5>
          )}
          {isInterimResult === true &&
            <React.Fragment>
              <EuiIcon type="alert"/><span className="interim-result">Interim result</span>
            </React.Fragment>
          }
        </EuiText>
        <EuiDescriptionList
          type="column"
          listItems={detailItems}
          className="anomaly-description-list"
        />
      </React.Fragment>
    );
  }

  renderInfluencers() {
    const anomalyInfluencers = this.props.anomaly.influencers;
    const listItems = [];
    let othersCount = 0;
    let numToDisplay = 0;
    if (anomalyInfluencers !== undefined) {
      numToDisplay = (this.state.showAllInfluencers === true) ?
        anomalyInfluencers.length : Math.min(this.props.influencersLimit, anomalyInfluencers.length);
      othersCount = Math.max(anomalyInfluencers.length - numToDisplay, 0);

      if (othersCount === 1) {
        // Display the 1 extra influencer as displaying "and 1 more" would also take up a line.
        numToDisplay++;
        othersCount = 0;
      }

      for (let i = 0; i < numToDisplay; i++) {
        Object.keys(anomalyInfluencers[i]).forEach((influencerFieldName) => {
          listItems.push({
            title: influencerFieldName,
            description: anomalyInfluencers[i][influencerFieldName]
          });
        });
      }
    }

    if (listItems.length > 0) {
      return (
        <React.Fragment>
          <EuiSpacer size="m" />
          <EuiText>
            <h5>Influencers</h5>
          </EuiText>
          <EuiDescriptionList
            type="column"
            listItems={listItems}
            className="anomaly-description-list"
          />
          {othersCount > 0 &&
            <EuiLink
              onClick={() => this.toggleAllInfluencers()}
            >
            and {othersCount} more
            </EuiLink>
          }
          {numToDisplay > (this.props.influencersLimit + 1) &&
            <EuiLink
              onClick={() => this.toggleAllInfluencers()}
            >
            show less
            </EuiLink>
          }
        </React.Fragment>
      );
    }
  }

  render() {

    return (
      <div className="ml-anomalies-table-details">
        {this.renderDescription()}
        <EuiSpacer size="m" />
        {this.renderDetails()}
        {this.renderInfluencers()}
      </div>
    );
  }
}

AnomalyDetails.propTypes = {
  anomaly: PropTypes.object.isRequired,
  examples: PropTypes.array,
  isAggregatedData: PropTypes.bool,
  filter: PropTypes.func,
  influencersLimit: PropTypes.number
};
