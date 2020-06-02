/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { DataPublicPluginSetup } from 'src/plugins/data/public';
import { selectMonitorStatusAlert, searchTextSelector } from '../../../../state/selectors';
import { AlertMonitorStatusComponent } from '../index';

interface Props {
  autocomplete: DataPublicPluginSetup['autocomplete'];
  enabled: boolean;
  numTimes: number;
  setAlertParams: (key: string, value: any) => void;
  timerange: {
    from: string;
    to: string;
  };
}

export const AlertMonitorStatus: React.FC<Props> = ({
  autocomplete,
  enabled,
  numTimes,
  setAlertParams,
  timerange,
}) => {
  const { filters, locations } = useSelector(selectMonitorStatusAlert);
  const searchText = useSelector(searchTextSelector);

  useEffect(() => {
    setAlertParams('search', searchText);
  }, [setAlertParams, searchText]);

  return (
    <AlertMonitorStatusComponent
      autocomplete={autocomplete}
      enabled={enabled}
      filters={filters}
      locations={locations}
      numTimes={numTimes}
      setAlertParams={setAlertParams}
      timerange={timerange}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { AlertMonitorStatus as default };
