/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useDispatch } from 'react-redux';
import React, { useCallback } from 'react';
import { AnomalyEntity } from '../../../common/components/ml/anomaly/use_anomalies_search';
import { SecuritySolutionLinkAnchor } from '../../../common/components/links';
import { SecurityPageName } from '../../../app/types';
import { usersActions } from '../../../explore/users/store';
import { hostsActions } from '../../../explore/hosts/store';
import { HostsType } from '../../../explore/hosts/store/model';
import { UsersType } from '../../../explore/users/store/model';

import { useKibana } from '../../../common/lib/kibana';

export const AnomaliesCountLink = ({
  count,
  jobId,
  entity,
}: {
  count: number;
  jobId?: string;
  entity: AnomalyEntity;
}) => {
  const dispatch = useDispatch();
  const { telemetry } = useKibana().services;

  const deepLinkId =
    entity === AnomalyEntity.User
      ? SecurityPageName.usersAnomalies
      : SecurityPageName.hostsAnomalies;

  const onClick = useCallback(() => {
    if (!jobId) return;

    telemetry.reportAnomaliesCountClicked({
      jobId,
      count,
    });

    if (entity === AnomalyEntity.User) {
      dispatch(
        usersActions.updateUsersAnomaliesJobIdFilter({
          jobIds: [jobId],
          usersType: UsersType.page,
        })
      );

      dispatch(
        usersActions.updateUsersAnomaliesInterval({
          interval: 'second',
          usersType: UsersType.page,
        })
      );
    } else {
      dispatch(
        hostsActions.updateHostsAnomaliesJobIdFilter({
          jobIds: [jobId],
          hostsType: HostsType.page,
        })
      );

      dispatch(
        hostsActions.updateHostsAnomaliesInterval({
          interval: 'second',
          hostsType: HostsType.page,
        })
      );
    }
  }, [jobId, telemetry, count, entity, dispatch]);

  return (
    <SecuritySolutionLinkAnchor onClick={onClick} deepLinkId={deepLinkId}>
      {count}
    </SecuritySolutionLinkAnchor>
  );
};
