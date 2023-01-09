/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Anomalies, AnomaliesByHost, Anomaly } from '../types';
import { getHostNameFromInfluencers } from '../influencers/get_host_name_from_influencers';

export const convertAnomaliesToHosts = (
  anomalies: Anomalies | null,
  jobNameById: Record<string, string | undefined>,
  hostName?: string
): AnomaliesByHost[] => {
  if (anomalies == null) {
    return [];
  } else {
    return anomalies.anomalies.reduce<AnomaliesByHost[]>((accum, item) => {
      if (getHostNameFromEntity(item, hostName)) {
        return [
          ...accum,
          { hostName: item.entityValue, jobName: jobNameById[item.jobId], anomaly: item },
        ];
      } else {
        const hostNameFromInfluencers = getHostNameFromInfluencers(item.influencers, hostName);
        if (hostNameFromInfluencers != null) {
          return [
            ...accum,
            {
              hostName: hostNameFromInfluencers,
              jobName: jobNameById[item.jobId],
              anomaly: item,
            },
          ];
        } else {
          return accum;
        }
      }
    }, []);
  }
};

export const getHostNameFromEntity = (anomaly: Anomaly, hostName?: string): boolean => {
  if (anomaly.entityName !== 'host.name') {
    return false;
  } else if (hostName == null) {
    return true;
  } else {
    return anomaly.entityValue === hostName;
  }
};
