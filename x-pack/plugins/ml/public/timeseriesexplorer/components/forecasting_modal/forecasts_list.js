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

import {
  EuiButton,
  EuiIcon,
  EuiInMemoryTable,
  EuiText,
  EuiToolTip
} from '@elastic/eui';

import { formatHumanReadableDateTimeSeconds } from '../../../util/date_utils';

function getColumns(viewForecast) {
  return [
    {
      field: 'forecast_create_timestamp',
      name: 'Created',
      dataType: 'date',
      render: (date) => formatHumanReadableDateTimeSeconds(date),
      sortable: true
    },
    {
      field: 'forecast_start_timestamp',
      name: 'From',
      dataType: 'date',
      render: (date) => formatHumanReadableDateTimeSeconds(date),
      sortable: true
    },
    {
      field: 'forecast_end_timestamp',
      name: 'To',
      dataType: 'date',
      render: (date) => formatHumanReadableDateTimeSeconds(date),
      sortable: true
    },
    {
      name: 'View',
      render: (forecast) => (
        <EuiButton
          className="view-forecast-btn"
          onClick={() => viewForecast(forecast.forecast_id)}
        >
          <i aria-hidden="true" className="fa fa-line-chart"/>
        </EuiButton>
      )
    }
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
        Previous forecasts
      </h3>
      <EuiToolTip
        position="right"
        content="Lists a maximum of five of the most recently run forecasts."
      >
        <EuiIcon
          type="questionInCircle"
          size="s"
        />
      </EuiToolTip>
      <EuiInMemoryTable
        items={forecasts}
        columns={getColumns(viewForecast)}
        pagination={false}
      />
    </EuiText>
  );
}

ForecastsList.propType = {
  forecasts: PropTypes.array,
  viewForecast: PropTypes.func.isRequired
};
