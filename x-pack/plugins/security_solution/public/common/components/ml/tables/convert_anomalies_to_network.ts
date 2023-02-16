/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Anomalies, AnomaliesByNetwork, Anomaly } from '../types';
import { isDestinationOrSource } from '../types';
import { getNetworkFromInfluencers } from '../influencers/get_network_from_influencers';

export const convertAnomaliesToNetwork = (
  anomalies: Anomalies | null,
  jobNameById: Record<string, string | undefined>,
  ip?: string
): AnomaliesByNetwork[] => {
  if (anomalies == null) {
    return [];
  } else {
    return anomalies.anomalies.reduce<AnomaliesByNetwork[]>((accum, item) => {
      if (isDestinationOrSource(item.entityName) && getNetworkFromEntity(item, ip)) {
        return [
          ...accum,
          {
            ip: item.entityValue,
            type: item.entityName,
            jobName: jobNameById[item.jobId] ?? item.jobId,
            anomaly: item,
          },
        ];
      } else {
        const network = getNetworkFromInfluencers(item.influencers, ip);
        if (network != null) {
          return [
            ...accum,
            {
              ip: network.ip,
              type: network.type,
              jobName: jobNameById[item.jobId] ?? item.jobId,
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

export const getNetworkFromEntity = (anomaly: Anomaly, ip?: string): boolean => {
  if (isDestinationOrSource(anomaly.entityName)) {
    if (ip == null) {
      return true;
    } else {
      return anomaly.entityValue === ip;
    }
  } else {
    return false;
  }
};
