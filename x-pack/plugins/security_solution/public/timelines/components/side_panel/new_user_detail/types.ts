/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import type { UserItem } from '../../../../../common/search_strategy';
import type { AzureManagedUser } from '../../../../../common/search_strategy/security_solution/users/managed_details';
import type { AnomalyTableProviderChildrenProps } from '../../../../common/components/ml/anomaly/anomaly_table_provider';

export interface ObservedUserTable {
  label: string;
  values: string[] | null | undefined | UserAnomalies;
  field: string;
}

export interface ManagedUserTable {
  label: string;
  value: string | null | undefined;
  field?: string;
}

export type ObservedUsersTableColumns = Array<EuiBasicTableColumn<ObservedUserTable>>;
export type ManagedUsersTableColumns = Array<EuiBasicTableColumn<ManagedUserTable>>;

export interface ObservedUserData {
  isLoading: boolean;
  details: UserItem;
  firstSeen: FirstLastSeenData;
  lastSeen: FirstLastSeenData;
  anomalies: UserAnomalies;
}

export interface ManagedUserData {
  isLoading: boolean;
  details: AzureManagedUser | undefined;
  isIntegrationEnabled: boolean;
  firstSeen: FirstLastSeenData;
  lastSeen: FirstLastSeenData;
}

export interface FirstLastSeenData {
  date: string | null | undefined;
  isLoading: boolean;
}

export interface UserAnomalies {
  isLoading: AnomalyTableProviderChildrenProps['isLoadingAnomaliesData'];
  anomalies: AnomalyTableProviderChildrenProps['anomaliesData'];
  jobNameById: AnomalyTableProviderChildrenProps['jobNameById'];
}
