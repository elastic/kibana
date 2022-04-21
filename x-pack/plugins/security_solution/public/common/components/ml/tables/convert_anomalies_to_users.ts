/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Anomalies, AnomaliesByUser, Anomaly } from '../types';
import { getUserNameFromInfluencers } from '../influencers/get_user_name_from_influencers';

export const convertAnomaliesToUsers = (
  anomalies: Anomalies | null,
  userName?: string
): AnomaliesByUser[] => {
  if (anomalies == null) {
    return [];
  } else {
    return anomalies.anomalies.reduce<AnomaliesByUser[]>((accum, item) => {
      if (getUserNameFromEntity(item, userName)) {
        return [...accum, { userName: item.entityValue, anomaly: item }];
      } else {
        const userNameFromInfluencers = getUserNameFromInfluencers(item.influencers, userName);
        if (userNameFromInfluencers != null) {
          return [...accum, { userName: userNameFromInfluencers, anomaly: item }];
        } else {
          return accum;
        }
      }
    }, []);
  }
};

export const getUserNameFromEntity = (anomaly: Anomaly, userName?: string): boolean => {
  if (anomaly.entityName !== 'user.name') {
    return false;
  } else if (userName == null) {
    return true;
  } else {
    return anomaly.entityValue === userName;
  }
};
