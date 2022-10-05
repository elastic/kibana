/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiIcon } from '@elastic/eui';
import { EntityCell, EntityCellFilter } from '../entity_cell';
import { formatHumanReadableDateTimeSeconds } from '../../../../common/util/date_utils';
import {
  getMultiBucketImpactLabel,
  showActualForFunction,
  showTypicalForFunction,
} from '../../../../common/util/anomaly_utils';
import { MULTI_BUCKET_IMPACT } from '../../../../common/constants/multi_bucket_impact';
import { AnomaliesTableRecord } from '../../../../common/types/anomalies';
import { formatValue } from '../../formatters/format_value';
import { ML_JOB_AGGREGATION } from '../../../../common/constants/aggregation_types';

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

export function getDetailsItems(anomaly: AnomaliesTableRecord, filter: EntityCellFilter) {
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
      // @ts-expect-error parseFloat accept take a number
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
