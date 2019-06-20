/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';
import { anomaliesTableData } from './anomalies_table_data';
import { getTopSeverityJobs } from './get_top_severity';

const stable: string[] = [];

// TODO: Pass in parameters to call the anomalies table data such as the host name, date start, date end, etc...
// TODO: Call the dependent hook of hasPrivileges to get that data or pass it directly into here or ignore this
// if the user does not have privileges

interface Args {
  ip: string;
  endDate: number;
  startDate: number;
}

export const useAnomaliesTableDataByNetwork = ({ ip, startDate, endDate }: Args) => {
  const [tableData, setTableData] = useState(stable);
  const [loading, setLoading] = useState(true);

  const fetchFunc = async (fetchIp: string, earliestMs: number, latestMs: number) => {
    const data = await anomaliesTableData({
      earliestMs,
      latestMs,
      influencers: [
        {
          fieldName: 'destination.ip',
          fieldValue: fetchIp,
        },
        {
          fieldName: 'source.ip',
          fieldValue: fetchIp,
        },
      ],
    });
    // TODO: Move this up and out of here
    console.log('[ip][Retrieved the anomalies Table Data for ip of]', data);
    const reduced = getTopSeverityJobs(data.anomalies);
    // TODO: Change out the hostname for the regular deal
    console.log('[ip][dataset reduced]:', reduced);
    setTableData(reduced);
    setLoading(false);
  };
  useEffect(
    () => {
      console.log(`[ip inputs with earliestMs active][${ip}][${startDate}][${endDate}]`);
      fetchFunc(ip, startDate, endDate);
      return () => {
        console.log('[Here is where you would unsubscribe]');
      };
    },
    [ip, startDate, endDate]
  );

  return [loading, tableData];
};
