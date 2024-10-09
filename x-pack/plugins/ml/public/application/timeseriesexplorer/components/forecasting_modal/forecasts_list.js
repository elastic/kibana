/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Lists details of previously run forecasts in a table.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiButtonIcon, EuiIconTip, EuiInMemoryTable, EuiText } from '@elastic/eui';

import { formatHumanReadableDateTimeSeconds } from '@kbn/ml-date-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useCurrentThemeVars } from '../../../contexts/kibana';

function getColumns(viewForecast) {
  return [
    {
      field: 'forecast_create_timestamp',
      name: i18n.translate('xpack.ml.timeSeriesExplorer.forecastsList.createdColumnName', {
        defaultMessage: 'Created',
      }),
      dataType: 'date',
      render: (date) => formatHumanReadableDateTimeSeconds(date),
      sortable: true,
    },
    {
      field: 'forecast_start_timestamp',
      name: i18n.translate('xpack.ml.timeSeriesExplorer.forecastsList.fromColumnName', {
        defaultMessage: 'From',
      }),
      dataType: 'date',
      render: (date) => formatHumanReadableDateTimeSeconds(date),
      sortable: true,
    },
    {
      field: 'forecast_end_timestamp',
      name: i18n.translate('xpack.ml.timeSeriesExplorer.forecastsList.toColumnName', {
        defaultMessage: 'To',
      }),
      dataType: 'date',
      render: (date) => formatHumanReadableDateTimeSeconds(date),
      sortable: true,
    },
    {
      name: i18n.translate('xpack.ml.timeSeriesExplorer.forecastsList.viewColumnName', {
        defaultMessage: 'View',
      }),
      width: '60px',
      render: (forecast) => {
        const viewForecastAriaLabel = i18n.translate(
          'xpack.ml.timeSeriesExplorer.forecastsList.viewForecastAriaLabel',
          {
            defaultMessage: 'View forecast created at {createdDate}',
            values: {
              createdDate: formatHumanReadableDateTimeSeconds(forecast.forecast_create_timestamp),
            },
          }
        );

        return (
          <EuiButtonIcon
            onClick={() => viewForecast(forecast.forecast_id)}
            iconType="singleMetricViewer"
            aria-label={viewForecastAriaLabel}
          />
        );
      },
    },
  ];
}

export function ForecastsList({ forecasts, viewForecast, selectedForecastId }) {
  const { euiTheme } = useCurrentThemeVars();

  const getRowProps = (item) => {
    return {
      'data-test-subj': `mlForecastsListRow row-${item.rowId}`,
      ...(item.forecast_id === selectedForecastId
        ? {
            style: {
              backgroundColor: `${euiTheme.euiPanelBackgroundColorModifiers.primary}`,
            },
          }
        : {}),
    };
  };

  return (
    <EuiText>
      <h3 aria-describedby="ml_aria_description_forecasting_modal_view_list">
        <FormattedMessage
          id="xpack.ml.timeSeriesExplorer.forecastsList.previousForecastsTitle"
          defaultMessage="Previous forecasts"
        />
        &nbsp;
        <EuiIconTip
          size="s"
          type="questionInCircle"
          content={
            <FormattedMessage
              id="xpack.ml.timeSeriesExplorer.forecastsList.listsOfFiveRecentlyRunForecastsTooltip"
              defaultMessage="Lists a maximum of five of the most recently run forecasts."
            />
          }
        />
      </h3>
      <EuiInMemoryTable
        items={forecasts}
        columns={getColumns(viewForecast)}
        pagination={false}
        data-test-subj="mlModalForecastTable"
        rowProps={getRowProps}
      />
    </EuiText>
  );
}

ForecastsList.propType = {
  forecasts: PropTypes.array,
  viewForecast: PropTypes.func.isRequired,
  selectedForecastId: PropTypes.string,
};
