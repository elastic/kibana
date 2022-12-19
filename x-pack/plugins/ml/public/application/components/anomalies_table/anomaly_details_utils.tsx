/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiToolTip,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { EntityCell, EntityCellFilter } from '../entity_cell';
import { formatHumanReadableDateTimeSeconds } from '../../../../common/util/date_utils';
import {
  showActualForFunction,
  showTypicalForFunction,
} from '../../../../common/util/anomaly_utils';
import { AnomaliesTableRecord, MLAnomalyDoc } from '../../../../common/types/anomalies';
import { formatValue } from '../../formatters/format_value';
import { ML_JOB_AGGREGATION } from '../../../../common/constants/aggregation_types';
import {
  getAnomalyScoreExplanationImpactValue,
  getSeverityColor,
} from '../../../../common/util/anomaly_utils';

const TIME_FIELD_NAME = 'timestamp';

interface Cause {
  typical: number[];
  actual: number[];
  probability: number;
  entityName?: string;
  entityValue?: string;
}

function getFilterEntity(entityName: string, entityValue: string, filter: EntityCellFilter) {
  return <EntityCell entityName={entityName} entityValue={entityValue} filter={filter} />;
}

export function getInfluencersItems(
  anomalyInfluencers: Array<Record<string, string>>,
  influencerFilter: EntityCellFilter,
  numToDisplay: number
) {
  const items: Array<{ title: string; description: React.ReactElement }> = [];
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

export const DetailsItems: FC<{
  anomaly: AnomaliesTableRecord;
  filter: EntityCellFilter;
  modelPlotEnabled: boolean;
}> = ({ anomaly, filter, modelPlotEnabled }) => {
  const source = anomaly.source;

  // TODO - when multivariate analyses are more common,
  // look in each cause for a 'correlatedByFieldValue' field,
  let causes: Cause[] = [];
  const sourceCauses = source.causes || [];
  let singleCauseByFieldName;
  let singleCauseByFieldValue;
  if (sourceCauses.length === 1) {
    // Metrics and probability will already have been placed at the top level.
    // If cause has byFieldValue, move it to a top level fields for display.
    if (sourceCauses[0].by_field_name !== undefined) {
      singleCauseByFieldName = sourceCauses[0].by_field_name;
      singleCauseByFieldValue = sourceCauses[0].by_field_value;
    }
  } else {
    causes = sourceCauses.map((cause) => {
      return {
        typical: cause.typical,
        actual: cause.actual,
        probability: cause.probability,
        // // Get the 'entity field name/value' to display in the cause -
        // // For by and over, use by_field_name/value (over_field_name/value are in the top level fields)
        // // For just an 'over' field - the over_field_name/value appear in both top level and cause.
        entityName: cause.by_field_name ? cause.by_field_name : cause.over_field_name,
        entityValue: cause.by_field_value ? cause.by_field_value : cause.over_field_value,
      };
    });
  }

  const items = [];
  if (source.partition_field_value !== undefined && source.partition_field_name !== undefined) {
    items.push({
      title: source.partition_field_name,
      description: getFilterEntity(
        source.partition_field_name,
        String(source.partition_field_value),
        filter
      ),
    });
  }

  if (source.by_field_value !== undefined && source.by_field_name !== undefined) {
    items.push({
      title: source.by_field_name,
      description: getFilterEntity(source.by_field_name, source.by_field_value, filter),
    });
  }

  if (singleCauseByFieldName !== undefined && singleCauseByFieldValue !== undefined) {
    // Display byField of single cause.
    items.push({
      title: singleCauseByFieldName,
      description: getFilterEntity(singleCauseByFieldName, singleCauseByFieldValue, filter),
    });
  }

  if (source.over_field_value !== undefined && source.over_field_name !== undefined) {
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

    if (
      modelPlotEnabled === false &&
      anomaly.source.anomaly_score_explanation?.lower_confidence_bound !== undefined &&
      anomaly.source.anomaly_score_explanation?.upper_confidence_bound !== undefined
    ) {
      items.push({
        title: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.upperBoundsTitle', {
          defaultMessage: 'Upper bound',
        }),
        description: formatValue(
          anomaly.source.anomaly_score_explanation?.upper_confidence_bound,
          source.function,
          undefined,
          source
        ),
      });

      items.push({
        title: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.lowerBoundsTitle', {
          defaultMessage: 'Lower bound',
        }),
        description: formatValue(
          anomaly.source.anomaly_score_explanation?.lower_confidence_bound,
          source.function,
          undefined,
          source
        ),
      });
    }
  }

  items.push({
    title: i18n.translate('xpack.ml.anomaliesTable.anomalyDetails.jobIdTitle', {
      defaultMessage: 'Job ID',
    }),
    description: anomaly.jobId,
  });

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
      // @ts-expect-error parseFloat accepts a number
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

  return (
    <>
      {items.map(({ title, description }) => (
        <>
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem css={{ width: '180px' }} grow={false}>
              {title}
            </EuiFlexItem>
            <EuiFlexItem>{description}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
        </>
      ))}
    </>
  );
};

export const AnomalyExplanationDetails: FC<{ anomaly: AnomaliesTableRecord }> = ({ anomaly }) => {
  const explanation = anomaly.source.anomaly_score_explanation;
  if (explanation === undefined) {
    return null;
  }
  const initialScore = Math.floor(1000 * anomaly.source.initial_record_score) / 1000;
  const finalScore = Math.floor(1000 * anomaly.source.record_score) / 1000;
  const scoreDifference = initialScore - finalScore;
  const ACCEPTABLE_NORMALIZATION = 10;

  const yes = i18n.translate('xpack.ml.anomaliesTable.anomalyExplanationDetails.yes', {
    defaultMessage: 'Yes',
  });
  const no = i18n.translate('xpack.ml.anomaliesTable.anomalyExplanationDetails.no', {
    defaultMessage: 'No',
  });

  const explanationDetails = [];
  const anomalyType = getAnomalyType(explanation);
  if (anomalyType !== null) {
    explanationDetails.push({
      title: (
        <FormattedMessage
          id="xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.anomalyType"
          defaultMessage="Anomaly type"
        />
      ),
      description: <>{anomalyType}</>,
    });
  }

  if (scoreDifference > ACCEPTABLE_NORMALIZATION) {
    explanationDetails.push({
      title: (
        <EuiToolTip
          position="left"
          content={i18n.translate(
            'xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.recordScoreTooltip',
            {
              defaultMessage:
                'The initial record score has been reduced based on the analysis of subsequent data.',
            }
          )}
        >
          <span>
            <FormattedMessage
              id="xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.recordScore"
              defaultMessage="Record score reduction"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      description: (
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false}>
            <RecordScore score={initialScore} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{` -> `}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <RecordScore score={finalScore} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    });
  }

  const impactDetails = [];

  if (explanation.anomaly_characteristics_impact !== undefined) {
    impactDetails.push({
      title: (
        <EuiToolTip
          position="left"
          content={getImpactTooltip(
            explanation.anomaly_characteristics_impact,
            'anomaly_characteristics'
          )}
        >
          <span>
            <FormattedMessage
              id="xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.anomalyCharacteristics"
              defaultMessage="Anomaly characteristics impact"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      description: <ImpactVisual score={explanation.anomaly_characteristics_impact} />,
    });
  }

  if (explanation.single_bucket_impact !== undefined) {
    impactDetails.push({
      title: (
        <EuiToolTip
          position="left"
          content={getImpactTooltip(explanation.single_bucket_impact, 'single_bucket')}
        >
          <span>
            <FormattedMessage
              id="xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.singleBucket"
              defaultMessage="Single bucket impact"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      description: <ImpactVisual score={explanation.single_bucket_impact} />,
    });
  }
  if (explanation.multi_bucket_impact !== undefined) {
    impactDetails.push({
      title: (
        <EuiToolTip
          position="left"
          content={getImpactTooltip(explanation.multi_bucket_impact, 'multi_bucket')}
        >
          <span>
            <FormattedMessage
              id="xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.multiBucket"
              defaultMessage="Multi bucket impact"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      description: <ImpactVisual score={explanation.multi_bucket_impact} />,
    });
  }
  if (explanation.high_variance_penalty !== undefined) {
    impactDetails.push({
      title: (
        <EuiToolTip
          position="left"
          content={i18n.translate(
            'xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.highVarianceTooltip',
            {
              defaultMessage:
                'Indicates reduction of anomaly score for the bucket with large confidence intervals. If a bucket has large confidence intervals, the score is reduced.',
            }
          )}
        >
          <span>
            <FormattedMessage
              id="xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.highVariance"
              defaultMessage="High variance interval"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      description: explanation.high_variance_penalty ? yes : no,
    });
  }
  if (explanation.incomplete_bucket_penalty !== undefined) {
    impactDetails.push({
      title: (
        <EuiToolTip
          position="left"
          content={i18n.translate(
            'xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.incompleteBucketTooltip',
            {
              defaultMessage:
                'If the bucket contains fewer samples than expected, the score is reduced.',
            }
          )}
        >
          <span>
            <FormattedMessage
              id="xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.incompleteBucket"
              defaultMessage="Incomplete bucket"
            />
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      description: explanation.incomplete_bucket_penalty ? yes : no,
    });
  }

  return (
    <div>
      <EuiText size="xs">
        <h4>
          <FormattedMessage
            id="xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationTitle"
            defaultMessage="Anomaly explanation"
          />
        </h4>
      </EuiText>
      <EuiSpacer size="s" />

      {explanationDetails.map(({ title, description }) => (
        <>
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem style={{ width: '220px' }} grow={false}>
              {title}
            </EuiFlexItem>
            <EuiFlexItem>{description}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
        </>
      ))}

      <EuiSpacer size="s" />
      {impactDetails.length ? (
        <>
          <EuiText size="xs">
            <h4>
              <FormattedMessage
                id="xpack.ml.anomaliesTable.anomalyDetails.impactOnScoreTitle"
                defaultMessage="Impact on initial score"
              />
            </h4>
          </EuiText>
          <EuiSpacer size="s" />

          {impactDetails.map(({ title, description }) => (
            <>
              <EuiFlexGroup gutterSize="none">
                <EuiFlexItem css={{ width: '220px' }} grow={false}>
                  {title}
                </EuiFlexItem>
                <EuiFlexItem>{description}</EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="xs" />
            </>
          ))}
        </>
      ) : null}
    </div>
  );
};

const RecordScore: FC<{ score: number }> = ({ score }) => {
  return (
    <div
      css={{
        borderBottom: '2px solid',
      }}
      style={{
        borderBottomColor: getSeverityColor(score),
      }}
    >
      {score}
    </div>
  );
};

function getAnomalyType(explanation: MLAnomalyDoc['anomaly_score_explanation']) {
  if (
    explanation === undefined ||
    explanation.anomaly_length === undefined ||
    explanation.anomaly_type === undefined
  ) {
    return null;
  }

  const dip = i18n.translate('xpack.ml.anomaliesTable.anomalyExplanationDetails.anomalyType.dip', {
    defaultMessage: 'Dip over {anomalyLength, plural, one {# bucket} other {# buckets}}',
    values: { anomalyLength: explanation.anomaly_length },
  });
  const spike = i18n.translate(
    'xpack.ml.anomaliesTable.anomalyExplanationDetails.anomalyType.spike',
    {
      defaultMessage: 'Spike over {anomalyLength, plural, one {# bucket} other {# buckets}}',
      values: { anomalyLength: explanation.anomaly_length },
    }
  );

  return explanation.anomaly_type === 'dip' ? dip : spike;
}

const impactTooltips = {
  anomaly_characteristics: {
    low: i18n.translate(
      'xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.anomalyCharacteristicsTooltip.low',
      {
        defaultMessage:
          'Moderate impact from the duration and magnitude of the detected anomaly relative to the historical average.',
      }
    ),
    medium: i18n.translate(
      'xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.anomalyCharacteristicsTooltip.medium',
      {
        defaultMessage:
          'Medium impact from the duration and magnitude of the detected anomaly relative to the historical average.',
      }
    ),
    high: i18n.translate(
      'xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.anomalyCharacteristicsTooltip.high',
      {
        defaultMessage:
          'High impact from the duration and magnitude of the detected anomaly relative to the historical average.',
      }
    ),
  },
  single_bucket: {
    low: i18n.translate(
      'xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.singleBucketTooltip.low',
      {
        defaultMessage:
          'The difference between actual and typical values in this bucket has a moderate impact.',
      }
    ),
    medium: i18n.translate(
      'xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.singleBucketTooltip.medium',
      {
        defaultMessage:
          'The difference between actual and typical values in this bucket has a significant impact.',
      }
    ),
    high: i18n.translate(
      'xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.singleBucketTooltip.high',
      {
        defaultMessage:
          'The difference between actual and typical values in this bucket has a high impact.',
      }
    ),
  },
  multi_bucket: {
    low: i18n.translate(
      'xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.multiBucketTooltip.low',
      {
        defaultMessage:
          'The differences between actual and typical values in the past 12 buckets have a moderate impact.',
      }
    ),
    medium: i18n.translate(
      'xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.multiBucketTooltip.medium',
      {
        defaultMessage:
          'The differences between actual and typical values in the past 12 buckets have a significant impact.',
      }
    ),
    high: i18n.translate(
      'xpack.ml.anomaliesTable.anomalyDetails.anomalyExplanationDetails.multiBucketTooltip.high',
      {
        defaultMessage:
          'The differences between actual and typical values in the past 12 buckets have a high impact.',
      }
    ),
  },
};

function getImpactTooltip(
  score: number,
  type: 'anomaly_characteristics' | 'single_bucket' | 'multi_bucket'
) {
  const value = getAnomalyScoreExplanationImpactValue(score);

  if (value < 3) {
    return impactTooltips[type].low;
  }
  if (value > 3) {
    return impactTooltips[type].high;
  }

  return impactTooltips[type].medium;
}

const ImpactVisual: FC<{ score: number }> = ({ score }) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  const impact = getAnomalyScoreExplanationImpactValue(score);
  const boxPx = '10px';
  const emptyBox = colors.lightShade;
  const fullBox = colors.primary;
  return (
    <EuiFlexGroup gutterSize="xs">
      {Array(5)
        .fill(null)
        .map((v, i) => {
          return (
            <EuiFlexItem grow={false}>
              <div
                css={{
                  height: boxPx,
                  width: boxPx,
                  borderRadius: '2px',
                }}
                style={{
                  backgroundColor: impact > i ? fullBox : emptyBox,
                }}
              />
            </EuiFlexItem>
          );
        })}
    </EuiFlexGroup>
  );
};
