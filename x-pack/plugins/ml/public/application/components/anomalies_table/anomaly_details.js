/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for displaying details of an anomaly in the expanded row section
 * of the anomalies table.
 */

import PropTypes from 'prop-types';
import React, { Component, Fragment } from 'react';
import { get, pick } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { formatHumanReadableDateTimeSeconds } from '../../../../common/util/date_utils';

import { EntityCell } from '../entity_cell';
import {
  getMultiBucketImpactLabel,
  getSeverity,
  showActualForFunction,
  showTypicalForFunction,
} from '../../../../common/util/anomaly_utils';
import { MULTI_BUCKET_IMPACT } from '../../../../common/constants/multi_bucket_impact';
import { formatValue } from '../../formatters/format_value';
import { MAX_CHARS } from './anomalies_table_constants';
import { ML_JOB_AGGREGATION } from '../../../../common/constants/aggregation_types';

const TIME_FIELD_NAME = 'timestamp';

function getFilterEntity(entityName, entityValue, filter) {
  return <EntityCell entityName={entityName} entityValue={entityValue} filter={filter} />;
}

function getDetailsItems(anomaly, filter) {
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
      const simplified = pick(cause, 'typical', 'actual', 'probability');
      // Get the 'entity field name/value' to display in the cause -
      // For by and over, use by_field_name/value (over_field_name/value are in the top level fields)
      // For just an 'over' field - the over_field_name/value appear in both top level and cause.
      simplified.entityName = cause.by_field_name ? cause.by_field_name : cause.over_field_name;
      simplified.entityValue = cause.by_field_value ? cause.by_field_value : cause.over_field_value;
      return simplified;
    });
  }

  const items = [];
  if (source.partition_field_value !== undefined) {
    items.push({
      title: source.partition_field_name,
      description: getFilterEntity(
        source.partition_field_name,
        source.partition_field_value,
        filter
      ),
    });
  }

  if (source.by_field_value !== undefined) {
    items.push({
      title: source.by_field_name,
      description: getFilterEntity(source.by_field_name, source.by_field_value, filter),
    });
  }

  if (singleCauseByFieldName !== undefined) {
    // Display byField of single cause.
    items.push({
      title: singleCauseByFieldName,
      description: getFilterEntity(singleCauseByFieldName, singleCauseByFieldValue, filter),
    });
  }

  if (source.over_field_value !== undefined) {
    items.push({
      title: source.over_field_name,
      description: getFilterEntity(source.over_field_name, source.over_field_value, filter),
    });
  }

  const anomalyTime = source[TIME_FIELD_NAME];
  let timeDesc = `${formatHumanReadableDateTimeSeconds(anomalyTime)}`;
  if (source.bucket_span !== undefined) {
    const anomalyEndTime = anomalyTime + source.bucket_span * 1000;
    timeDesc = i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.anomalyTimeRangeLabel', {
      defaultMessage: '{anomalyTime} to {anomalyEndTime}',
      values: {
        anomalyTime: formatHumanReadableDateTimeSeconds(anomalyTime),
        anomalyEndTime: formatHumanReadableDateTimeSeconds(anomalyEndTime),
      },
    });
  }
  items.push({
    title: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.timeTitle', {
      defaultMessage: 'Time',
    }),
    description: timeDesc,
  });

  items.push({
    title: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.functionTitle', {
      defaultMessage: 'Function',
    }),
    description:
      source.function !== ML_JOB_AGGREGATION.METRIC ? source.function : source.function_description,
  });

  if (source.field_name !== undefined) {
    items.push({
      title: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.fieldNameTitle', {
        defaultMessage: 'Field name',
      }),
      description: source.field_name,
    });
  }

  const functionDescription = source.function_description || '';
  if (anomaly.actual !== undefined && showActualForFunction(functionDescription) === true) {
    items.push({
      title: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.actualTitle', {
        defaultMessage: 'Actual',
      }),
      description: formatValue(anomaly.actual, source.function, undefined, source),
    });
  }

  if (anomaly.typical !== undefined && showTypicalForFunction(functionDescription) === true) {
    items.push({
      title: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.typicalTitle', {
        defaultMessage: 'Typical',
      }),
      description: formatValue(anomaly.typical, source.function, undefined, source),
    });
  }

  items.push({
    title: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.jobIdTitle', {
      defaultMessage: 'Job ID',
    }),
    description: anomaly.jobId,
  });

  if (
    source.multi_bucket_impact !== undefined &&
    source.multi_bucket_impact >= MULTI_BUCKET_IMPACT.LOW
  ) {
    items.push({
      title: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.multiBucketImpactTitle', {
        defaultMessage: 'Multi-bucket impact',
      }),
      description: getMultiBucketImpactLabel(source.multi_bucket_impact),
    });
  }

  items.push({
    title: (
      <EuiToolTip
        position="left"
        content={i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.recordScoreTooltip', {
          defaultMessage:
            'A normalized score between 0-100, which indicates the relative significance of the anomaly record result. This value might change as new data is analyzed.',
        })}
      >
        <span>
          {i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.recordScoreTitle', {
            defaultMessage: 'Record score',
          })}
          <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
        </span>
      </EuiToolTip>
    ),
    description: Math.floor(1000 * source.record_score) / 1000,
  });

  items.push({
    title: (
      <EuiToolTip
        position="left"
        content={i18n.translate(
          'xpack.ml.anomaliesTable.anomalyDetails.initialRecordScoreTooltip',
          {
            defaultMessage:
              'A normalized score between 0-100, which indicates the relative significance of the anomaly record when the bucket was initially processed.',
          }
        )}
      >
        <span>
          {i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.initialRecordScoreTitle', {
            defaultMessage: 'Initial record score',
          })}
          <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
        </span>
      </EuiToolTip>
    ),
    description: Math.floor(1000 * source.initial_record_score) / 1000,
  });

  items.push({
    title: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.probabilityTitle', {
      defaultMessage: 'Probability',
    }),
    description:
      source.probability !== undefined ? Number.parseFloat(source.probability).toPrecision(3) : '',
  });

  // If there was only one cause, the actual, typical and by_field
  // will already have been added for display.
  if (causes.length > 1) {
    causes.forEach((cause, index) => {
      const title =
        index === 0
          ? i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.causeValuesTitle', {
              defaultMessage: '{causeEntityName} values',
              values: {
                causeEntityName: cause.entityName,
              },
            })
          : '';
      const description = i18n.translate(
        'xpack.ml.anomaliesTable.anomalyDetails.causeValuesDescription',
        {
          defaultMessage:
            '{causeEntityValue} (actual {actualValue}, ' +
            'typical {typicalValue}, probability {probabilityValue})',
          values: {
            causeEntityValue: cause.entityValue,
            actualValue: formatValue(cause.actual, source.function),
            typicalValue: formatValue(cause.typical, source.function),
            probabilityValue: cause.probability,
          },
        }
      );
      items.push({ title, description });
    });
  }

  return items;
}
// anomalyInfluencers: [ {fieldName: fieldValue}, {fieldName: fieldValue}, ... ]
function getInfluencersItems(anomalyInfluencers, influencerFilter, numToDisplay) {
  const items = [];

  for (let i = 0; i < numToDisplay; i++) {
    Object.keys(anomalyInfluencers[i]).forEach((influencerFieldName) => {
      const value = anomalyInfluencers[i][influencerFieldName];

      items.push({
        title: influencerFieldName,
        description: getFilterEntity(influencerFieldName, value, influencerFilter),
      });
    });
  }

  return items;
}

export class AnomalyDetails extends Component {
  static propTypes = {
    anomaly: PropTypes.object.isRequired,
    examples: PropTypes.array,
    definition: PropTypes.object,
    isAggregatedData: PropTypes.bool,
    filter: PropTypes.func,
    influencersLimit: PropTypes.number,
    influencerFilter: PropTypes.func,
    tabIndex: PropTypes.number.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      showAllInfluencers: false,
    };

    if (this.props.examples !== undefined && this.props.examples.length > 0) {
      this.tabs = [
        {
          id: 'Details',
          name: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.detailsTitle', {
            defaultMessage: 'Details',
          }),
          content: (
            <Fragment>
              <div
                className="ml-anomalies-table-details"
                data-test-subj="mlAnomaliesListRowDetails"
              >
                {this.renderDescription()}
                <EuiSpacer size="m" />
                {this.renderDetails()}
                {this.renderInfluencers()}
              </div>
            </Fragment>
          ),
        },
        {
          id: 'category-examples',
          name: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.categoryExamplesTitle', {
            defaultMessage: 'Category examples',
          }),
          content: <Fragment>{this.renderCategoryExamples()}</Fragment>,
        },
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
        {definition !== undefined && definition.terms && (
          <Fragment>
            <EuiFlexItem key={`example-terms`}>
              <EuiText size="xs">
                <h4 className="mlAnomalyCategoryExamples__header">
                  {i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.termsTitle', {
                    defaultMessage: 'Terms',
                  })}
                </h4>
                &nbsp;
                <EuiIconTip
                  aria-label={i18n.translate(
                    'xpack.ml.anomaliesTable.anomalyDetails.termsDescriptionAriaLabel',
                    {
                      defaultMessage: 'Description',
                    }
                  )}
                  type="questionInCircle"
                  color="subdued"
                  size="s"
                  content={
                    <FormattedMessage
                      id="xpack.ml.anomaliesTable.anomalyDetails.termsDescriptionTooltip"
                      defaultMessage="A space separated list of the common tokens that are matched in values of the category
                    (may have been truncated to a max character limit of {maxChars})"
                      values={{ maxChars: MAX_CHARS }}
                    />
                  }
                />
              </EuiText>
              <EuiText size="xs">{definition.terms}</EuiText>
            </EuiFlexItem>
            <EuiSpacer size="xs" />
          </Fragment>
        )}
        {definition !== undefined && definition.regex && (
          <Fragment>
            <EuiFlexItem key={`example-regex`}>
              <EuiText size="xs">
                <h4 className="mlAnomalyCategoryExamples__header">
                  {i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.regexTitle', {
                    defaultMessage: 'Regex',
                  })}
                </h4>
                &nbsp;
                <EuiIconTip
                  aria-label={i18n.translate(
                    'xpack.ml.anomaliesTable.anomalyDetails.regexDescriptionAriaLabel',
                    {
                      defaultMessage: 'Description',
                    }
                  )}
                  type="questionInCircle"
                  color="subdued"
                  size="s"
                  content={
                    <FormattedMessage
                      id="xpack.ml.anomaliesTable.anomalyDetails.regexDescriptionTooltip"
                      defaultMessage="The regular expression that is used to search for values that match the category
                      (may have been truncated to a max character limit of {maxChars})"
                      values={{ maxChars: MAX_CHARS }}
                    />
                  }
                />
              </EuiText>
              <EuiText size="xs">{definition.regex}</EuiText>
            </EuiFlexItem>
            <EuiSpacer size="xs" />
          </Fragment>
        )}

        {examples.map((example, i) => {
          return (
            <EuiFlexItem key={`example${i}`}>
              {i === 0 && definition !== undefined && (
                <EuiText size="s">
                  <h4>
                    {i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.examplesTitle', {
                      defaultMessage: 'Examples',
                    })}
                  </h4>
                </EuiText>
              )}
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

    let anomalyDescription = i18n.translate(
      'xpack.ml.anomaliesTable.anomalyDetails.anomalyInLabel',
      {
        defaultMessage: '{anomalySeverity} anomaly in {anomalyDetector}',
        values: {
          anomalySeverity: getSeverity(anomaly.severity).label,
          anomalyDetector: anomaly.detector,
        },
      }
    );
    if (anomaly.entityName !== undefined) {
      anomalyDescription += i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.foundForLabel', {
        defaultMessage: ' found for {anomalyEntityName} {anomalyEntityValue}',
        values: {
          anomalyEntityName: anomaly.entityName,
          anomalyEntityValue: anomaly.entityValue,
        },
      });
    }

    if (
      source.partition_field_name !== undefined &&
      source.partition_field_name !== anomaly.entityName
    ) {
      anomalyDescription += i18n.translate(
        'xpack.ml.anomaliesTable.anomalyDetails.detectedInLabel',
        {
          defaultMessage: ' detected in {sourcePartitionFieldName} {sourcePartitionFieldValue}',
          values: {
            sourcePartitionFieldName: source.partition_field_name,
            sourcePartitionFieldValue: source.partition_field_value,
          },
        }
      );
    }

    // Check for a correlatedByFieldValue in the source which will be present for multivariate analyses
    // where the record is anomalous due to relationship with another 'by' field value.
    let mvDescription = undefined;
    if (source.correlated_by_field_value !== undefined) {
      mvDescription = i18n.translate(
        'xpack.ml.anomaliesTable.anomalyDetails.multivariateDescription',
        {
          defaultMessage:
            'multivariate correlations found in {sourceByFieldName}; ' +
            '{sourceByFieldValue} is considered anomalous given {sourceCorrelatedByFieldValue}',
          values: {
            sourceByFieldName: source.by_field_name,
            sourceByFieldValue: source.by_field_value,
            sourceCorrelatedByFieldValue: source.correlated_by_field_value,
          },
        }
      );
    }

    return (
      <React.Fragment>
        <EuiText size="xs">
          <h4>
            <FormattedMessage
              id="xpack.ml.anomaliesTable.anomalyDetails.descriptionTitle"
              defaultMessage="Description"
            />
          </h4>
          {anomalyDescription}
        </EuiText>
        {mvDescription !== undefined && <EuiText size="xs">{mvDescription}</EuiText>}
      </React.Fragment>
    );
  }

  renderDetails() {
    const detailItems = getDetailsItems(this.props.anomaly, this.props.filter);
    const isInterimResult = get(this.props.anomaly, 'source.is_interim', false);
    return (
      <React.Fragment>
        <EuiText size="xs">
          {this.props.isAggregatedData === true ? (
            <h4>
              <FormattedMessage
                id="xpack.ml.anomaliesTable.anomalyDetails.detailsOnHighestSeverityAnomalyTitle"
                defaultMessage="Details on highest severity anomaly"
              />
            </h4>
          ) : (
            <h4>
              <FormattedMessage
                id="xpack.ml.anomaliesTable.anomalyDetails.anomalyDetailsTitle"
                defaultMessage="Anomaly details"
              />
            </h4>
          )}
          {isInterimResult === true && (
            <React.Fragment>
              <EuiIcon type="alert" />
              <span className="interim-result">
                <FormattedMessage
                  id="xpack.ml.anomaliesTable.anomalyDetails.interimResultLabel"
                  defaultMessage="Interim result"
                />
              </span>
            </React.Fragment>
          )}
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
    let listItems = [];
    let othersCount = 0;
    let numToDisplay = 0;
    if (anomalyInfluencers !== undefined) {
      numToDisplay =
        this.state.showAllInfluencers === true
          ? anomalyInfluencers.length
          : Math.min(this.props.influencersLimit, anomalyInfluencers.length);
      othersCount = Math.max(anomalyInfluencers.length - numToDisplay, 0);

      if (othersCount === 1) {
        // Display the 1 extra influencer as displaying "and 1 more" would also take up a line.
        numToDisplay++;
        othersCount = 0;
      }

      listItems = getInfluencersItems(
        anomalyInfluencers,
        this.props.influencerFilter,
        numToDisplay
      );
    }

    if (listItems.length > 0) {
      return (
        <React.Fragment>
          <EuiSpacer size="m" />
          <EuiText size="xs">
            <h4>
              <FormattedMessage
                id="xpack.ml.anomaliesTable.anomalyDetails.influencersTitle"
                defaultMessage="Influencers"
              />
            </h4>
          </EuiText>
          <EuiDescriptionList
            type="column"
            listItems={listItems}
            className="anomaly-description-list"
          />
          {othersCount > 0 && (
            <EuiLink onClick={() => this.toggleAllInfluencers()}>
              <FormattedMessage
                id="xpack.ml.anomaliesTable.anomalyDetails.anomalyDescriptionListMoreLinkText"
                defaultMessage="and {othersCount} more"
                values={{ othersCount }}
              />
            </EuiLink>
          )}
          {numToDisplay > this.props.influencersLimit + 1 && (
            <EuiLink onClick={() => this.toggleAllInfluencers()}>
              <FormattedMessage
                id="xpack.ml.anomaliesTable.anomalyDetails.anomalyDescriptionShowLessLinkText"
                defaultMessage="Show less"
              />
            </EuiLink>
          )}
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
        <div className="ml-anomalies-table-details" data-test-subj="mlAnomaliesListRowDetails">
          {this.renderDescription()}
          <EuiSpacer size="m" />
          {this.renderDetails()}
          {this.renderInfluencers()}
        </div>
      );
    }
  }
}
