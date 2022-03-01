/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import qs from 'query-string';
import { useHistory, useLocation } from 'react-router-dom';
import { UI_SETTINGS } from '../../../../../src/plugins/data/public';
import { useKibanaServices } from './use_kibana_services';

export interface TimePickerTimeDefaults {
  from: string;
  to: string;
}

export function useDateRangeRedirect() {
  const history = useHistory();
  const location = useLocation();
  const query = qs.parse(location.search);

  const { data, uiSettings } = useKibanaServices();

  const timePickerTimeDefaults = uiSettings.get<TimePickerTimeDefaults>(
    UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
  );

  const timePickerSharedState = data.query.timefilter.timefilter.getTime();

  const isDateRangeSet = 'rangeFrom' in query && 'rangeTo' in query;

  const redirect = () => {
    const nextQuery = {
      rangeFrom: timePickerSharedState.from ?? timePickerTimeDefaults.from,
      rangeTo: timePickerSharedState.to ?? timePickerTimeDefaults.to,
      ...query,
    };

    history.replace({
      ...location,
      search: qs.stringify(nextQuery),
    });
  };

  return {
    isDateRangeSet,
    redirect,
  };
}
