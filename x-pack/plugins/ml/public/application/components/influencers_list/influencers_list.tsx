/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering a list of Machine Learning influencers.
 */

import React, { FC } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { abbreviateWholeNumber } from '../../formatters/abbreviate_whole_number';
import { getSeverity, getFormattedSeverityScore } from '../../../../common/util/anomaly_utils';
import { EntityCell, EntityCellFilter } from '../entity_cell';

export interface InfluencerValueData {
  influencerFieldValue: string;
  maxAnomalyScore: number;
  sumAnomalyScore: number;
}

interface InfluencerProps {
  influencerFieldName: string;
  influencerFilter: EntityCellFilter;
  valueData: InfluencerValueData;
}

interface InfluencersByNameProps {
  influencerFieldName: string;
  influencerFilter: EntityCellFilter;
  fieldValues: InfluencerValueData[];
}

interface InfluencersListProps {
  influencers: { [id: string]: InfluencerValueData[] };
  influencerFilter: EntityCellFilter;
}

function getTooltipContent(maxScoreLabel: string, totalScoreLabel: string) {
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

const Influencer: FC<InfluencerProps> = ({ influencerFieldName, influencerFilter, valueData }) => {
  const maxScore = Math.floor(valueData.maxAnomalyScore);
  const maxScoreLabel = getFormattedSeverityScore(valueData.maxAnomalyScore);
  const severity = getSeverity(maxScore);
  const totalScore = Math.floor(valueData.sumAnomalyScore);
  const totalScoreLabel = getFormattedSeverityScore(valueData.sumAnomalyScore);

  // Ensure the bar has some width for 0 scores.
  const barScore = maxScore !== 0 ? maxScore : 1;
  const barStyle = {
    width: `${barScore}%`,
  };

  const tooltipContent = getTooltipContent(maxScoreLabel, totalScoreLabel);

  return (
    <div data-test-subj={`mlInfluencerEntry field-${influencerFieldName}`}>
      <div className="field-label" data-test-subj="mlInfluencerEntryFieldLabel">
        <EntityCell
          entityName={influencerFieldName}
          entityValue={valueData.influencerFieldValue}
          filter={influencerFilter}
        />
      </div>
      <div className={`progress ${severity.id}`}>
        <div className="progress-bar-holder">
          <div className="progress-bar" style={barStyle} />
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
};

const InfluencersByName: FC<InfluencersByNameProps> = ({
  influencerFieldName,
  influencerFilter,
  fieldValues,
}) => {
  const influencerValues = fieldValues.map((valueData) => (
    <Influencer
      key={valueData.influencerFieldValue}
      influencerFieldName={influencerFieldName}
      influencerFilter={influencerFilter}
      valueData={valueData}
    />
  ));

  return (
    <React.Fragment key={influencerFieldName}>
      <EuiTitle size="xs" data-test-subj={`mlInfluencerFieldName ${influencerFieldName}`}>
        <h3>{influencerFieldName}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      {influencerValues}
    </React.Fragment>
  );
};

export const InfluencersList: FC<InfluencersListProps> = ({ influencers, influencerFilter }) => {
  if (influencers === undefined || Object.keys(influencers).length === 0) {
    return (
      <EuiFlexGroup justifyContent="spaceAround" className="ml-influencers-list">
        <EuiFlexItem grow={false}>
          <EuiSpacer size="xxl" />
          <EuiTitle size="xs" className="influencer-title">
            <h3>
              <FormattedMessage
                id="xpack.ml.influencersList.noInfluencersFoundTitle"
                defaultMessage="No influencers found"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const influencersByName = Object.keys(influencers).map((influencerFieldName) => (
    <InfluencersByName
      key={influencerFieldName}
      influencerFieldName={influencerFieldName}
      influencerFilter={influencerFilter}
      fieldValues={influencers[influencerFieldName]}
    />
  ));

  return <div className="ml-influencers-list">{influencersByName}</div>;
};
