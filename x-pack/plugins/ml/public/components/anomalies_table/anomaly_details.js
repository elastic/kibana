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
import React, { Component, Fragment } from 'react';
import _ from 'lodash';

import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiSpacer,
  EuiTabbedContent,
  EuiText
} from '@elastic/eui';
import { formatHumanReadableDateTimeSeconds } from '../../util/date_utils';

import { EntityCell } from './entity_cell';
import {
  getMultiBucketImpactLabel,
  getSeverity,
  showActualForFunction,
  showTypicalForFunction,
} from '../../../common/util/anomaly_utils';
import { MULTI_BUCKET_IMPACT } from '../../../common/constants/multi_bucket_impact';
import { formatValue } from '../../formatters/format_value';
import { MAX_CHARS } from './anomalies_table_constants';

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
  let timeDesc = `${formatHumanReadableDateTimeSeconds(anomalyTime)}`;
  if (source.bucket_span !== undefined) {
    const anomalyEndTime = anomalyTime + (source.bucket_span * 1000);
    timeDesc += ` to ${formatHumanReadableDateTimeSeconds(anomalyEndTime)}`;
  }
  items.push({
    title: 'time',
    description: timeDesc
  });

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

  if (source.multi_bucket_impact !== undefined &&
    source.multi_bucket_impact >= MULTI_BUCKET_IMPACT.LOW) {
    items.push({
      title: 'multi-bucket impact',
      description: getMultiBucketImpactLabel(source.multi_bucket_impact)
    });
  }

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

    if (this.props.examples !== undefined && this.props.examples.length > 0) {
      this.tabs = [{
        id: 'Details',
        name: 'Details',
        content: (
          <Fragment>
            <div className="ml-anomalies-table-details">
              {this.renderDescription()}
              <EuiSpacer size="m" />
              {this.renderDetails()}
              {this.renderInfluencers()}
            </div>
          </Fragment>
        )
      },
      {
        id: 'Category examples',
        name: 'Category examples',
        content: (
          <Fragment>
            {this.renderCategoryExamples()}
          </Fragment>
        ),
      }
      ];
    }
  }

  toggleAllInfluencers() {
    this.setState({ showAllInfluencers: !this.state.showAllInfluencers });
  }

  renderCategoryExamples() {
    const { examples, definition } = this.props;

    return (
      <EuiFlexGroup
        direction="column"
        justifyContent="center"
        gutterSize="m"
        className="mlAnomalyCategoryExamples"
      >
        {(definition !== undefined && definition.terms) &&
        <Fragment>
          <EuiFlexItem key={`example-terms`}>
            <EuiText size="xs">
              <h4 className="mlAnomalyCategoryExamples__header">Terms</h4>&nbsp;
              <EuiIconTip
                aria-label="Description"
                type="questionInCircle"
                color="subdued"
                size="s"
                content={`A space separated list of the common tokens that are matched in values of the category
                (may have been truncated to a max character limit of ${MAX_CHARS})`}
              />
            </EuiText>
            <EuiText size="xs">
              {definition.terms}
            </EuiText>
          </EuiFlexItem>
          <EuiSpacer size="m" />
        </Fragment> }
        {(definition !== undefined && definition.regex) &&
          <Fragment>
            <EuiFlexItem key={`example-regex`}>
              <EuiText size="xs">
                <h4 className="mlAnomalyCategoryExamples__header">Regex</h4>&nbsp;
                <EuiIconTip
                  aria-label="Description"
                  type="questionInCircle"
                  color="subdued"
                  size="s"
                  content={`The regular expression that is used to search for values that match the category
                  (may have been truncated to a max character limit of ${MAX_CHARS})`}
                />
              </EuiText>
              <EuiText size="xs">
                {definition.regex}
              </EuiText>
            </EuiFlexItem>
            <EuiSpacer size="l" />
          </Fragment>}

        {examples.map((example, i) => {
          return (
            <EuiFlexItem key={`example${i}`}>
              {(i === 0 && definition !== undefined) &&
                <EuiText size="s">
                  <h4>Examples</h4>
                </EuiText>}
              <span className="mlAnomalyCategoryExamples__item">{example}</span>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    );
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
          <h4>Description</h4>
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
        <EuiText size="xs">
          {this.props.isAggregatedData === true ? (
            <h4>Details on highest severity anomaly</h4>
          ) : (
            <h4>Anomaly details</h4>
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
          <EuiText size="xs">
            <h4>Influencers</h4>
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
    const { tabIndex } = this.props;

    if (this.tabs !== undefined) {
      return (
        <EuiTabbedContent
          tabs={this.tabs}
          size="s"
          initialSelectedTab={this.tabs[tabIndex]}
          onTabClick={() => {}}
        />
      );
    } else {
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
}

AnomalyDetails.propTypes = {
  anomaly: PropTypes.object.isRequired,
  examples: PropTypes.array,
  definition: PropTypes.object,
  isAggregatedData: PropTypes.bool,
  filter: PropTypes.func,
  influencersLimit: PropTypes.number,
  tabIndex: PropTypes.number.isRequired
};
