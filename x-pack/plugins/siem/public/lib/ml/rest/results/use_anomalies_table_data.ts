/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useContext } from 'react';
import moment from 'moment-timezone';
import { anomaliesTableData } from './anomalies_table_data';
import { InfluencerInput, Anomalies } from '../../types/anomalies';
import { KibanaConfigContext } from '../../../adapters/framework/kibana_framework_adapter';

interface Args {
  influencers: InfluencerInput[] | null;
  endDate: number;
  startDate: number;
}

type Return = [boolean, Anomalies | null];

export const influencersToString = (influencers: InfluencerInput[] | null): string =>
  influencers == null
    ? ''
    : influencers.reduce((accum, item) => `${accum}${item.fieldName}:${item.fieldValue}`, '');

export const useAnomaliesTableData = ({ influencers, startDate, endDate }: Args): Return => {
  const [tableData, setTableData] = useState<Anomalies | null>(null);
  const [loading, setLoading] = useState(true);
  const config = useContext(KibanaConfigContext);

  const fetchFunc = async (
    influencersInput: InfluencerInput[] | null,
    earliestMs: number,
    latestMs: number
  ) => {
    if (influencersInput != null) {
      const data = await anomaliesTableData(
        {
          jobIds: [],
          criteriaFields: [],
          aggregationInterval: 'auto',
          threshold: 0,
          earliestMs,
          latestMs,
          influencers: influencersInput,
          dateFormatTz: config.dateFormatTz || moment.tz.guess(),
          maxRecords: 500,
          maxExamples: 10,
        },
        {
          'kbn-version': config.kbnVersion,
        }
      );
      setTableData(data);
      setLoading(false);
    } else {
      setTableData(null);
      setLoading(true);
    }
  };

  useEffect(
    () => {
      fetchFunc(influencers, startDate, endDate);
    },
    [influencersToString(influencers), startDate, endDate]
  );

  return [loading, tableData];
};
