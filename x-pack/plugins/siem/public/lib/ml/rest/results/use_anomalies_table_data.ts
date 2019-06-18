/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { HostItem } from '../../../../../public/graphql/types';
import { anomaliesTableData } from './anomalies_table_data';
import { getTopSeverityJobs } from './get_top_severity';

const stable: string[{}] = [];

// TODO: Pass in parameters to call the anomalies table data such as the host name, date start, date end, etc...
// TODO: Call the dependent hook of hasPrivileges to get that data or pass it directly into here or ignore this
// if the user does not have privileges

interface Args {
  hostItem: HostItem | null | undefined;
  endDate: number;
  startDate: number;
}

export const useAnomaliesTableData = ({ hostItem, startDate, endDate }: Args) => {
  const [tableData, setTableData] = useState(stable);

  const fetchFunc = async (hostName: string, earliestMs: number, latestMs: number) => {
    console.log('earliestMS:', earliestMs);
    const data = await anomaliesTableData({
      earliestMs,
      latestMs,
      influencers: [
        {
          fieldName: 'host.hostname', // TODO: Change this back to host.name once the jobs are fixed
          fieldValue: hostName,
        },
        {
          fieldName: 'host.name', // TODO: Change this back to host.name once the jobs are fixed
          fieldValue: hostName,
        },
      ],
    });
    // TODO: Move this up and out of here
    console.log('Retrieved the anomalies Table Data of:', data);
    const reduced = getTopSeverityJobs(data.anomalies);
    // TODO: Change out the hostname for the regular deal
    console.log('[FINAL setTableData call]:', reduced);
    setTableData(reduced);
  };

  useEffect(
    () => {
      if (
        hostItem != null &&
        hostItem.host != null &&
        hostItem.host.name != null &&
        hostItem.host.name[0]
      ) {
        console.log('Here we are with data in the useEffect and I have data');
        fetchFunc(hostItem.host.name[0], startDate, endDate);
      } else {
        console.log('I have no data yet');
      }

      return () => {
        console.log('[Here is where you would unsubscribe]');
      };
    },
    [hostItem, startDate, endDate]
  );

  return tableData;
};
