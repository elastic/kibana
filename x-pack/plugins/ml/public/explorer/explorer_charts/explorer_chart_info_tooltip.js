/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import './styles/explorer_chart_info_tooltip.less';

import PropTypes from 'prop-types';
import React from 'react';

import { CHART_TYPE } from '../explorer_constants';

const CHART_DESCRIPTION = {
  [CHART_TYPE.EVENT_DISTRIBUTION]: 'The gray dots depict the distribution of occurences over time for a sample of by_field_values with \
more frequent event types at the top and rarer ones at the bottom.',
  [CHART_TYPE.POPULATION_DISTRIBUTION]: 'The gray dots depict the distribution of values over time for a sample of over_field_values.'
};

import { EuiSpacer } from '@elastic/eui';

function TooltipDefinitionList({ toolTipData }) {
  return (
    <dl className="mlDescriptionList">
      {toolTipData.map(({ title, description }) => (
        <React.Fragment key={`${title} ${description}`}>
          <dt className="mlDescriptionList__title">{title}</dt>
          <dd className="mlDescriptionList__description">{description}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export function ExplorerChartInfoTooltip({
  jobId,
  aggregationInterval,
  chartFunction,
  chartType,
  entityFields = [],
}) {
  const chartDescription = CHART_DESCRIPTION[chartType];

  const toolTipData = [
    {
      title: 'job ID',
      description: jobId,
    },
    {
      title: 'aggregation interval',
      description: aggregationInterval,
    },
    {
      title: 'chart function',
      description: chartFunction,
    },
  ];

  entityFields.forEach((entityField) => {
    toolTipData.push({
      title: entityField.fieldName,
      description: entityField.fieldValue
    });
  });

  return (
    <div className="ml-explorer-chart-info-tooltip">
      <TooltipDefinitionList toolTipData={toolTipData} />
      {chartDescription && (
        <React.Fragment>
          <EuiSpacer size="s" />
          <div className="ml-explorer-chart-description">{chartDescription}</div>
        </React.Fragment>
      )}
    </div>
  );
}
ExplorerChartInfoTooltip.propTypes = {
  jobId: PropTypes.string.isRequired,
  aggregationInterval: PropTypes.string,
  chartFunction: PropTypes.string,
  entityFields: PropTypes.array
};
