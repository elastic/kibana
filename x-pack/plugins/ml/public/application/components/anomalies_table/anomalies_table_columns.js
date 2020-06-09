/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiLink, EuiScreenReaderOnly } from '@elastic/eui';

import React from 'react';
import _ from 'lodash';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  formatHumanReadableDate,
  formatHumanReadableDateTime,
  formatHumanReadableDateTimeSeconds,
} from '../../util/date_utils';

import { DescriptionCell } from './description_cell';
import { DetectorCell } from './detector_cell';
import { EntityCell } from '../entity_cell';
import { InfluencersCell } from './influencers_cell';
import { LinksMenu } from './links_menu';
import { checkPermission } from '../../capabilities/check_capabilities';
import { mlFieldFormatService } from '../../services/field_format_service';
import { isRuleSupported } from '../../../../common/util/anomaly_utils';
import { formatValue } from '../../formatters/format_value';
import { INFLUENCERS_LIMIT, ANOMALIES_TABLE_TABS } from './anomalies_table_constants';
import { SeverityCell } from './severity_cell';

function renderTime(date, aggregationInterval) {
  if (aggregationInterval === 'hour') {
    return formatHumanReadableDateTime(date);
  } else if (aggregationInterval === 'second') {
    return formatHumanReadableDateTimeSeconds(date);
  } else {
    return formatHumanReadableDate(date);
  }
}

function showLinksMenuForItem(item, showViewSeriesLink) {
  const canConfigureRules = isRuleSupported(item.source) && checkPermission('canUpdateJob');
  return (
    canConfigureRules ||
    (showViewSeriesLink && item.isTimeSeriesViewRecord) ||
    item.entityName === 'mlcategory' ||
    item.customUrls !== undefined
  );
}

export function getColumns(
  items,
  jobIds,
  examplesByJobId,
  isAggregatedData,
  interval,
  bounds,
  showViewSeriesLink,
  showRuleEditorFlyout,
  itemIdToExpandedRowMap,
  toggleRow,
  filter,
  influencerFilter
) {
  const columns = [
    {
      name: (
        <EuiScreenReaderOnly>
          <p>
            <FormattedMessage
              id="xpack.ml.anomaliesTable.showDetailsColumn.screenReaderDescription"
              defaultMessage="This column contains clickable controls for showing more details on each anomaly"
            />
          </p>
        </EuiScreenReaderOnly>
      ),
      render: (item) => (
        <EuiButtonIcon
          onClick={() => toggleRow(item)}
          iconType={itemIdToExpandedRowMap[item.rowId] ? 'arrowDown' : 'arrowRight'}
          aria-label={
            itemIdToExpandedRowMap[item.rowId]
              ? i18n.translate('xpack.ml.anomaliesTable.hideDetailsAriaLabel', {
                  defaultMessage: 'Hide details',
                })
              : i18n.translate('xpack.ml.anomaliesTable.showDetailsAriaLabel', {
                  defaultMessage: 'Show details',
                })
          }
          data-row-id={item.rowId}
          data-test-subj="mlJobListRowDetailsToggle"
        />
      ),
    },
    {
      field: 'time',
      'data-test-subj': 'mlAnomaliesListColumnTime',
      name: i18n.translate('xpack.ml.anomaliesTable.timeColumnName', {
        defaultMessage: 'time',
      }),
      dataType: 'date',
      scope: 'row',
      render: (date) => renderTime(date, interval),
      textOnly: true,
      sortable: true,
    },
    {
      field: 'severity',
      'data-test-subj': 'mlAnomaliesListColumnSeverity',
      name: i18n.translate('xpack.ml.anomaliesTable.severityColumnName', {
        defaultMessage: 'severity',
      }),
      render: (score, item) => (
        <SeverityCell score={score} multiBucketImpact={item.source.multi_bucket_impact} />
      ),
      sortable: true,
    },
    {
      field: 'detector',
      'data-test-subj': 'mlAnomaliesListColumnDetector',
      name: i18n.translate('xpack.ml.anomaliesTable.detectorColumnName', {
        defaultMessage: 'detector',
      }),
      render: (detectorDescription, item) => (
        <DetectorCell detectorDescription={detectorDescription} numberOfRules={item.rulesLength} />
      ),
      textOnly: true,
      sortable: true,
    },
  ];

  if (items.some((item) => item.entityValue !== undefined)) {
    columns.push({
      field: 'entityValue',
      'data-test-subj': 'mlAnomaliesListColumnFoundFor',
      name: i18n.translate('xpack.ml.anomaliesTable.entityValueColumnName', {
        defaultMessage: 'found for',
      }),
      render: (entityValue, item) => (
        <EntityCell
          entityName={item.entityName}
          entityValue={entityValue}
          filter={filter}
          wrapText={true}
        />
      ),
      textOnly: true,
      sortable: true,
    });
  }

  if (items.some((item) => item.influencers !== undefined)) {
    columns.push({
      field: 'influencers',
      'data-test-subj': 'mlAnomaliesListColumnInfluencers',
      name: i18n.translate('xpack.ml.anomaliesTable.influencersColumnName', {
        defaultMessage: 'influenced by',
      }),
      render: (influencers) => (
        <InfluencersCell
          limit={INFLUENCERS_LIMIT}
          influencers={influencers}
          influencerFilter={influencerFilter}
        />
      ),
      textOnly: true,
      sortable: true,
    });
  }

  // Map the additional 'sort' fields to the actual, typical and description
  // fields to ensure sorting is done correctly on the underlying metric value
  // and not on e.g. the actual values array as a String.
  if (items.some((item) => item.actual !== undefined)) {
    columns.push({
      field: 'actualSort',
      'data-test-subj': 'mlAnomaliesListColumnActual',
      name: i18n.translate('xpack.ml.anomaliesTable.actualSortColumnName', {
        defaultMessage: 'actual',
      }),
      render: (actual, item) => {
        const fieldFormat = mlFieldFormatService.getFieldFormat(
          item.jobId,
          item.source.detector_index
        );
        return formatValue(item.actual, item.source.function, fieldFormat, item.source);
      },
      sortable: true,
    });
  }

  if (items.some((item) => item.typical !== undefined)) {
    columns.push({
      field: 'typicalSort',
      'data-test-subj': 'mlAnomaliesListColumnTypical',
      name: i18n.translate('xpack.ml.anomaliesTable.typicalSortColumnName', {
        defaultMessage: 'typical',
      }),
      render: (typical, item) => {
        const fieldFormat = mlFieldFormatService.getFieldFormat(
          item.jobId,
          item.source.detector_index
        );
        return formatValue(item.typical, item.source.function, fieldFormat, item.source);
      },
      sortable: true,
    });

    // Assume that if we are showing typical, there will be an actual too,
    // so we can add a column to describe how actual compares to typical.
    const nonTimeOfDayOrWeek = items.some((item) => {
      const summaryRecFunc = item.source.function;
      return summaryRecFunc !== 'time_of_day' && summaryRecFunc !== 'time_of_week';
    });
    if (nonTimeOfDayOrWeek === true) {
      columns.push({
        field: 'metricDescriptionSort',
        'data-test-subj': 'mlAnomaliesListColumnDescription',
        name: i18n.translate('xpack.ml.anomaliesTable.metricDescriptionSortColumnName', {
          defaultMessage: 'description',
        }),
        render: (metricDescriptionSort, item) => (
          <DescriptionCell actual={item.actual} typical={item.typical} />
        ),
        textOnly: true,
        sortable: true,
      });
    }
  }

  if (jobIds && jobIds.length > 1) {
    columns.push({
      field: 'jobId',
      'data-test-subj': 'mlAnomaliesListColumnJobID',
      name: i18n.translate('xpack.ml.anomaliesTable.jobIdColumnName', {
        defaultMessage: 'job ID',
      }),
      sortable: true,
    });
  }

  const showExamples = items.some((item) => item.entityName === 'mlcategory');
  if (showExamples === true) {
    columns.push({
      'data-test-subj': 'mlAnomaliesListColumnCategoryExamples',
      name: i18n.translate('xpack.ml.anomaliesTable.categoryExamplesColumnName', {
        defaultMessage: 'category examples',
      }),
      sortable: false,
      truncateText: true,
      render: (item) => {
        const examples = _.get(examplesByJobId, [item.jobId, item.entityValue], []);
        return (
          <EuiLink
            className="mlAnomalyCategoryExamples__link"
            onClick={() => toggleRow(item, ANOMALIES_TABLE_TABS.CATEGORY_EXAMPLES)}
          >
            {examples.map((example, i) => {
              return (
                <span key={`example${i}`} className="category-example">
                  {example}
                </span>
              );
            })}
          </EuiLink>
        );
      },
      textOnly: true,
      width: '13%',
    });
  }

  const showLinks = items.some((item) => showLinksMenuForItem(item, showViewSeriesLink));

  if (showLinks === true) {
    columns.push({
      'data-test-subj': 'mlAnomaliesListColumnAction',
      name: i18n.translate('xpack.ml.anomaliesTable.actionsColumnName', {
        defaultMessage: 'actions',
      }),
      render: (item) => {
        if (showLinksMenuForItem(item, showViewSeriesLink) === true) {
          return (
            <LinksMenu
              anomaly={item}
              bounds={bounds}
              showViewSeriesLink={showViewSeriesLink}
              isAggregatedData={isAggregatedData}
              interval={interval}
              showRuleEditorFlyout={showRuleEditorFlyout}
            />
          );
        } else {
          return null;
        }
      },
    });
  }

  return columns;
}
