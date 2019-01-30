/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for rendering a list of Machine Learning influencers.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { abbreviateWholeNumber } from 'plugins/ml/formatters/abbreviate_whole_number';
import { getSeverity } from 'plugins/ml/../common/util/anomaly_utils';


function getTooltipContent(maxScoreLabel, totalScoreLabel) {
  return (
    <React.Fragment>
      <p>
        <FormattedMessage
          id="xpack.ml.influencersList.maxAnomalyScoreTooltipDescription"
          defaultMessage="Maximum anomaly score: {maxScoreLabel}"
          values={{ maxScoreLabel }}
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.ml.influencersList.totalAnomalyScoreTooltipDescription"
          defaultMessage="Total anomaly score: {totalScoreLabel}"
          values={{ totalScoreLabel }}
        />
      </p>
    </React.Fragment>
  );
}

function Influencer({ influencerFieldName, valueData }) {
  const maxScorePrecise = valueData.maxAnomalyScore;
  const maxScore = parseInt(maxScorePrecise);
  const maxScoreLabel = (maxScore !== 0) ? maxScore : '< 1';
  const severity = getSeverity(maxScore);
  const totalScore = parseInt(valueData.sumAnomalyScore);
  const totalScoreLabel = (totalScore !== 0) ? totalScore : '< 1';

  // Ensure the bar has some width for 0 scores.
  const barScore = (maxScore !== 0) ? maxScore : 1;
  const barStyle = {
    width: `${barScore}%`
  };

  const tooltipContent = getTooltipContent(maxScoreLabel, totalScoreLabel);

  return (
    <div>
      <div className="field-label">
        {(influencerFieldName !== 'mlcategory') ? (
          <div className="field-value">{valueData.influencerFieldValue}</div>
        ) : (
          <div className="field-value">mlcategory {valueData.influencerFieldValue}</div>
        )}
      </div>
      <div className={`progress ${severity.id}`} value="{valueData.maxAnomalyScore}" max="100">
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
          <span>{(totalScore > 0) ? abbreviateWholeNumber(totalScore, 4) : totalScoreLabel}</span>
        </EuiToolTip>
      </div>
    </div>
  );
}
Influencer.propTypes = {
  influencerFieldName: PropTypes.string.isRequired,
  valueData: PropTypes.object.isRequired
};

function InfluencersByName({ influencerFieldName, fieldValues }) {
  const influencerValues = fieldValues.map(valueData => (
    <Influencer
      key={valueData.influencerFieldValue}
      influencerFieldName={influencerFieldName}
      valueData={valueData}
    />
  ));

  return (
    <React.Fragment key={influencerFieldName}>
      <EuiTitle size="xs">
        <h4>{influencerFieldName}</h4>
      </EuiTitle>
      <EuiSpacer size="xs"/>
      {influencerValues}
    </React.Fragment>
  );
}
InfluencersByName.propTypes = {
  influencerFieldName: PropTypes.string.isRequired,
  fieldValues: PropTypes.array.isRequired
};

export function InfluencersList({ influencers }) {

  if (influencers === undefined || Object.keys(influencers).length === 0) {
    return (
      <EuiFlexGroup justifyContent="spaceAround">
        <EuiFlexItem grow={false}>
          <EuiSpacer size="xxl" />
          <EuiText>
            <h4>
              <FormattedMessage
                id="xpack.ml.influencersList.noInfluencersFoundTitle"
                defaultMessage="No influencers found"
              />
            </h4>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const influencersByName = Object.keys(influencers).map(influencerFieldName => (
    <InfluencersByName
      key={influencerFieldName}
      influencerFieldName={influencerFieldName}
      fieldValues={influencers[influencerFieldName]}
    />
  ));

  return (
    <div className="ml-influencers-list">
      {influencersByName}
    </div>
  );
}
InfluencersList.propTypes = {
  influencers: PropTypes.object
};
