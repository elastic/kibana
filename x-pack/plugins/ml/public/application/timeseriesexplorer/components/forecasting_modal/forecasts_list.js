/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Lists details of previously run forecasts in a table.
 */

import PropTypes from 'prop-types';
import React from 'react';

import { EuiButtonIcon, EuiIcon, EuiInMemoryTable, EuiText, EuiToolTip } from '@elastic/eui';

import { formatHumanReadableDateTimeSeconds } from '../../../util/date_utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

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
            iconType="stats"
            aria-label={viewForecastAriaLabel}
          />
        );
      },
    },
  ];
}

// TODO - add in ml-info-icon to the h3 element,
//        then remove tooltip and inline style.
export function ForecastsList({ forecasts, viewForecast }) {
  return (
    <EuiText>
      <h3
        aria-describedby="ml_aria_description_forecasting_modal_view_list"
        style={{ display: 'inline', paddingRight: '5px' }}
      >
        <FormattedMessage
          id="xpack.ml.timeSeriesExplorer.forecastsList.previousForecastsTitle"
          defaultMessage="Previous forecasts"
        />
      </h3>
      <EuiToolTip
        position="right"
        content={
          <FormattedMessage
            id="xpack.ml.timeSeriesExplorer.forecastsList.listsOfFiveRecentlyRunForecastsTooltip"
            defaultMessage="Lists a maximum of five of the most recently run forecasts."
          />
        }
      >
        <EuiIcon type="questionInCircle" size="s" />
      </EuiToolTip>
      <EuiInMemoryTable
        items={forecasts}
        columns={getColumns(viewForecast)}
        pagination={false}
        data-test-subj="mlModalForecastTable"
      />
    </EuiText>
  );
}

ForecastsList.propType = {
  forecasts: PropTypes.array,
  viewForecast: PropTypes.func.isRequired,
};
