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
} from '@elastic/eui';

import { getSeverity } from '../../../../common/util/anomaly_utils';
import { MAX_CHARS } from './anomalies_table_constants';

import { getDetailsItems, getInfluencersItems } from './anomaly_details_utils';

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
    const isInterimResult = this.props.anomaly.source?.is_interim ?? false;
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
