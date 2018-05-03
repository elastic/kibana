/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for rendering a list of Machine Learning influencers..
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip
} from '@elastic/eui';

import { abbreviateWholeNumber } from 'plugins/ml/formatters/abbreviate_whole_number';
import { getSeverity } from 'plugins/ml/util/anomaly_utils';


export class InfluencersList extends Component {

  constructor(props) {
    super(props);
  }

  getTooltipContent(maxScoreLabel, totalScoreLabel) {
    return (
      <React.Fragment>
        <p>Maximum anomaly score: {maxScoreLabel}</p>
        <p>Total anomaly score: {totalScoreLabel}</p>
      </React.Fragment>
    );
  }

  renderInfluencerValue(influencerFieldName, valueData) {
    const maxScorePrecise = valueData.maxAnomalyScore;
    const maxScore = parseInt(maxScorePrecise);
    const maxScoreLabel = maxScore !== 0 ? maxScore : '< 1';
    const severity = getSeverity(maxScore);
    const totalScore = parseInt(valueData.sumAnomalyScore);
    const totalScoreLabel = totalScore !== 0 ? totalScore : '< 1';

    // Ensure the bar has some width for 0 scores.
    const barScore = maxScore !== 0 ? maxScore : 1;
    const barStyle = {
      width: `${barScore}%`
    };

    const tooltipContent = this.getTooltipContent(maxScoreLabel, totalScoreLabel);

    return (
      <div key={valueData.influencerFieldValue}>
        <div className="field-label">
          {influencerFieldName !== 'mlcategory' ? (
            <div className="field-value">{valueData.influencerFieldValue}</div>
          ) : (
            <div className="field-value">mlcategory {valueData.influencerFieldValue}</div>
          )}
        </div>
        <div className={`progress ${severity}`} value="{valueData.maxAnomalyScore}" max="100">
          <div className="progress-bar-holder">
            <div className="progress-bar" style={barStyle}/>
          </div>
          <div className="score-label">
            <EuiToolTip
              position="right"
              className="ml-influencers-list-tooltip"
              title={`${influencerFieldName}: ${valueData.influencerFieldValue}`}
              content={tooltipContent}
            >
              <span>{maxScoreLabel}</span>
            </EuiToolTip>
          </div>
        </div>
        <div className="total-score-label">
          <EuiToolTip
            position="right"
            className="ml-influencers-list-tooltip"
            title={`${influencerFieldName}: ${valueData.influencerFieldValue}`}
            content={tooltipContent}
          >
            <span>{totalScore > 0 ? abbreviateWholeNumber(totalScore, 4) : totalScoreLabel}</span>
          </EuiToolTip>
        </div>
      </div>
    );
  }

  renderInfluencer(name, fieldValues) {
    const influencerValues = fieldValues.map(valueData => this.renderInfluencerValue(name, valueData));

    return (
      <React.Fragment key={name}>
        <EuiTitle size="xs">
          <h4>{name}</h4>
        </EuiTitle>
        <EuiSpacer size="xs"/>
        {influencerValues}
      </React.Fragment>
    );
  }

  render() {
    const influencers = this.props.influencers;
    if (influencers === undefined || Object.keys(influencers).length === 0) {
      return (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiSpacer size="xxl" />
            <EuiText>
              <h4>No influencers found</h4>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    const influencersByName = Object.keys(influencers).map((influencerName) => {
      return this.renderInfluencer(influencerName, influencers[influencerName]);
    });

    return (
      <div className="ml-influencers-list">
        {influencersByName}
      </div>
    );
  }
}

InfluencersList.propTypes = {
  influencers: PropTypes.object
};
