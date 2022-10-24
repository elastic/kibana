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

import React, { FC, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { capitalize } from 'lodash';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { getSeverity } from '../../../../common/util/anomaly_utils';
import { MAX_CHARS } from './anomalies_table_constants';
import type { CategoryDefinition } from '../../services/ml_api_service/results';
import { AnomaliesTableRecordExtended } from '../../../../common/types/anomalies';
import { EntityCellFilter } from '../entity_cell';
import { ExplorerJob } from '../../explorer/explorer_utils';

import {
  getInfluencersItems,
  AnomalyExplanationDetails,
  DetailsItems,
} from './anomaly_details_utils';

interface Props {
  anomaly: AnomaliesTableRecordExtended;
  examples: string[];
  definition: CategoryDefinition;
  isAggregatedData: boolean;
  filter: EntityCellFilter;
  influencersLimit: number;
  influencerFilter: EntityCellFilter;
  tabIndex: number;
  job: ExplorerJob;
}

export const AnomalyDetails: FC<Props> = ({
  anomaly,
  examples,
  definition,
  isAggregatedData,
  filter,
  influencersLimit,
  influencerFilter,
  tabIndex,
  job,
}) => {
  if (examples !== undefined && examples.length > 0) {
    const tabs = [
      {
        id: 'Details',
        name: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.detailsTitle', {
          defaultMessage: 'Details',
        }),
        content: (
          <Contents
            anomaly={anomaly}
            filter={filter}
            influencerFilter={influencerFilter}
            influencersLimit={influencersLimit}
            isAggregatedData={isAggregatedData}
            job={job}
          />
        ),
      },
      {
        id: 'category-examples',
        name: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.categoryExamplesTitle', {
          defaultMessage: 'Category examples',
        }),
        content: <CategoryExamples examples={examples} definition={definition} />,
      },
    ];

    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTabbedContent
            tabs={tabs}
            size="s"
            initialSelectedTab={tabs[tabIndex]}
            onTabClick={() => {}}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <Contents
      anomaly={anomaly}
      filter={filter}
      influencerFilter={influencerFilter}
      influencersLimit={influencersLimit}
      isAggregatedData={isAggregatedData}
      job={job}
    />
  );
};

const Contents: FC<{
  anomaly: AnomaliesTableRecordExtended;
  isAggregatedData: boolean;
  filter: EntityCellFilter;
  influencersLimit: number;
  influencerFilter: EntityCellFilter;
  job: ExplorerJob;
}> = ({ anomaly, isAggregatedData, filter, influencersLimit, influencerFilter, job }) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  const dividerStyle = useMemo(() => {
    return isPopulatedObject(anomaly.source.anomaly_score_explanation)
      ? { borderRight: `1px solid ${colors.lightShade}` }
      : {};
  }, [colors, anomaly]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <div className="ml-anomalies-table-details" data-test-subj="mlAnomaliesListRowDetails">
          <Description anomaly={anomaly} />
          <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem css={dividerStyle}>
              <Details
                anomaly={anomaly}
                isAggregatedData={isAggregatedData}
                filter={filter}
                job={job}
              />
              <Influencers
                anomaly={anomaly}
                influencerFilter={influencerFilter}
                influencersLimit={influencersLimit}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <AnomalyExplanationDetails anomaly={anomaly} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const Description: FC<{ anomaly: AnomaliesTableRecordExtended }> = ({ anomaly }) => {
  const source = anomaly.source;

  let anomalyDescription = i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.anomalyInLabel', {
    defaultMessage: '{anomalySeverity} anomaly in {anomalyDetector}',
    values: {
      anomalySeverity: capitalize(getSeverity(anomaly.severity).label),
      anomalyDetector: anomaly.detector,
    },
  });
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
    anomalyDescription += i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.detectedInLabel', {
      defaultMessage: ' detected in {sourcePartitionFieldName} {sourcePartitionFieldValue}',
      values: {
        sourcePartitionFieldName: source.partition_field_name,
        sourcePartitionFieldValue: source.partition_field_value,
      },
    });
  }

  // Check for a correlatedByFieldValue in the source which will be present for multivariate analyses
  // where the record is anomalous due to relationship with another 'by' field value.
  let mvDescription;
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
    <>
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
    </>
  );
};

const Details: FC<{
  anomaly: AnomaliesTableRecordExtended;
  isAggregatedData: boolean;
  filter: EntityCellFilter;
  job: ExplorerJob;
}> = ({ anomaly, isAggregatedData, filter, job }) => {
  const isInterimResult = anomaly.source?.is_interim ?? false;
  return (
    <>
      <EuiText size="xs">
        {isAggregatedData === true ? (
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
          <>
            <EuiIcon type="alert" />
            <span className="interim-result">
              <FormattedMessage
                id="xpack.ml.anomaliesTable.anomalyDetails.interimResultLabel"
                defaultMessage="Interim result"
              />
            </span>
          </>
        )}
      </EuiText>

      <EuiSpacer size="xs" />

      <DetailsItems anomaly={anomaly} filter={filter} modelPlotEnabled={job.modelPlotEnabled} />
    </>
  );
};

const Influencers: FC<{
  anomaly: AnomaliesTableRecordExtended;
  influencersLimit: number;
  influencerFilter: EntityCellFilter;
}> = ({ anomaly, influencersLimit, influencerFilter }) => {
  const [showAllInfluencers, setShowAllInfluencers] = useState(false);
  const toggleAllInfluencers = setShowAllInfluencers.bind(null, (prev) => !prev);

  const anomalyInfluencers = anomaly.influencers;
  let listItems: Array<{ title: string; description: React.ReactElement }> = [];
  let othersCount = 0;
  let numToDisplay = 0;
  if (anomalyInfluencers !== undefined) {
    numToDisplay =
      showAllInfluencers === true
        ? anomalyInfluencers.length
        : Math.min(influencersLimit, anomalyInfluencers.length);
    othersCount = Math.max(anomalyInfluencers.length - numToDisplay, 0);

    if (othersCount === 1) {
      // Display the 1 extra influencer as displaying "and 1 more" would also take up a line.
      numToDisplay++;
      othersCount = 0;
    }

    listItems = getInfluencersItems(anomalyInfluencers, influencerFilter, numToDisplay);
  }

  if (listItems.length > 0) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiText size="xs">
          <h4>
            <FormattedMessage
              id="xpack.ml.anomaliesTable.anomalyDetails.influencersTitle"
              defaultMessage="Influencers"
            />
          </h4>
        </EuiText>

        {listItems.map(({ title, description }) => (
          <>
            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem style={{ width: '180px' }} grow={false}>
                {title}
              </EuiFlexItem>
              <EuiFlexItem>{description}</EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
          </>
        ))}
        {othersCount > 0 && (
          <EuiLink onClick={() => toggleAllInfluencers()}>
            <FormattedMessage
              id="xpack.ml.anomaliesTable.anomalyDetails.anomalyDescriptionListMoreLinkText"
              defaultMessage="and {othersCount} more"
              values={{ othersCount }}
            />
          </EuiLink>
        )}
        {numToDisplay > influencersLimit + 1 && (
          <EuiLink onClick={() => toggleAllInfluencers()}>
            <FormattedMessage
              id="xpack.ml.anomaliesTable.anomalyDetails.anomalyDescriptionShowLessLinkText"
              defaultMessage="Show less"
            />
          </EuiLink>
        )}
      </>
    );
  }
  return null;
};

const CategoryExamples: FC<{ definition: CategoryDefinition; examples: string[] }> = ({
  definition,
  examples,
}) => {
  return (
    <EuiFlexGroup
      direction="column"
      justifyContent="center"
      gutterSize="m"
      className="mlAnomalyCategoryExamples"
    >
      {definition !== undefined && definition.terms && (
        <>
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
        </>
      )}
      {definition !== undefined && definition.regex && (
        <>
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
        </>
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
};
