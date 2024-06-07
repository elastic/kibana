/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';

import type { HostEcs, OsEcs } from '@kbn/securitysolution-ecs';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';

import { EuiButton } from '@elastic/eui';
import { useMutation } from '@tanstack/react-query';
import { useToggle } from 'react-use';
import { AssetCriticalityModal } from '../../../../entity_analytics/components/asset_criticality/asset_criticality_selector';
import type { DeleteAssetCriticalityResponse } from '../../../../entity_analytics/api/api';
import { useEntityAnalyticsRoutes } from '../../../../entity_analytics/api/api';
import type { Params } from '../../../../entity_analytics/components/asset_criticality/use_asset_criticality';
import type { AssetCriticalityRecord } from '../../../../../common/api/entity_analytics';
import { HostsFields } from '../../../../../common/api/search_strategy/hosts/model/sort';
import type {
  Columns,
  Criteria,
  ItemsPerRow,
  SortingBasicTable,
} from '../../../components/paginated_table';
import { PaginatedTable } from '../../../components/paginated_table';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { hostsActions, hostsModel, hostsSelectors } from '../../store';
import { getHostsColumns } from './columns';
import * as i18n from './translations';
import type {
  HostsEdges,
  HostItem,
  HostsSortField,
} from '../../../../../common/search_strategy/security_solution/hosts';
import type { Direction, RiskSeverity } from '../../../../../common/search_strategy';
import {
  ENABLE_ASSET_CRITICALITY_SETTING,
  SecurityPageName,
} from '../../../../../common/constants';
import { HostsTableType } from '../../store/model';
import { useNavigateTo } from '../../../../common/lib/kibana/hooks';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { useHasSecurityCapability } from '../../../../helper_hooks';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';

const tableType = hostsModel.HostsTableType.hosts;

interface HostsTableProps {
  data: HostsEdges[];
  fakeTotalCount: number;
  id: string;
  isInspect: boolean;
  loading: boolean;
  loadPage: (newActivePage: number) => void;
  setQuerySkip: (skip: boolean) => void;
  showMorePagesIndicator: boolean;
  totalCount: number;
  type: hostsModel.HostsType;
}

export type HostsTableColumns = [
  Columns<HostEcs['name']>,
  Columns<HostItem['lastSeen']>,
  Columns<OsEcs['name']>,
  Columns<OsEcs['version']>,
  Columns<RiskSeverity>?
];

const rowItems: ItemsPerRow[] = [
  {
    text: i18n.ROWS_5,
    numberOfRow: 5,
  },
  {
    text: i18n.ROWS_10,
    numberOfRow: 10,
  },
];
const getSorting = (sortField: HostsFields, direction: Direction): SortingBasicTable => ({
  field: getNodeField(sortField),
  direction,
});

const HostsTableComponent: React.FC<HostsTableProps> = ({
  data,
  fakeTotalCount,
  id,
  isInspect,
  loading,
  loadPage,
  setQuerySkip,
  showMorePagesIndicator,
  totalCount,
  type,
}) => {
  const dispatch = useDispatch();
  const { navigateTo } = useNavigateTo();
  const getHostsSelector = useMemo(() => hostsSelectors.hostsSelector(), []);
  const { activePage, direction, limit, sortField } = useDeepEqualSelector((state) =>
    getHostsSelector(state, type)
  );

  const updateLimitPagination = useCallback(
    (newLimit) =>
      dispatch(
        hostsActions.updateTableLimit({
          hostsType: type,
          limit: newLimit,
          tableType,
        })
      ),
    [type, dispatch]
  );

  const updateActivePage = useCallback(
    (newPage) =>
      dispatch(
        hostsActions.updateTableActivePage({
          activePage: newPage,
          hostsType: type,
          tableType,
        })
      ),
    [type, dispatch]
  );

  const onChange = useCallback(
    (criteria: Criteria) => {
      if (criteria.sort != null) {
        const sort: HostsSortField = {
          field: getSortField(criteria.sort.field),
          direction: criteria.sort.direction as Direction,
        };
        if (sort.direction !== direction || sort.field !== sortField) {
          dispatch(
            hostsActions.updateHostsSort({
              sort,
              hostsType: type,
            })
          );
        }
      }
    },
    [direction, sortField, type, dispatch]
  );

  const [selected, setSelected] = useState<HostsEdges[]>([]);

  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const isPlatinumOrTrialLicense = useMlCapabilities().isPlatinumOrTrialLicense;

  const dispatchSeverityUpdate = useCallback(
    (s: RiskSeverity) => {
      dispatch(
        hostsActions.updateHostRiskScoreSeverityFilter({
          severitySelection: [s],
          hostsType: type,
        })
      );
      navigateTo({
        deepLinkId: SecurityPageName.hosts,
        path: HostsTableType.risk,
      });
    },
    [dispatch, navigateTo, type]
  );

  const [isAssetCriticalityEnabled] = useUiSetting$<boolean>(ENABLE_ASSET_CRITICALITY_SETTING);

  const hostsColumns = useMemo(
    () =>
      getHostsColumns(
        isPlatinumOrTrialLicense && hasEntityAnalyticsCapability,
        dispatchSeverityUpdate,
        isAssetCriticalityEnabled
      ),
    [
      dispatchSeverityUpdate,
      isPlatinumOrTrialLicense,
      hasEntityAnalyticsCapability,
      isAssetCriticalityEnabled,
    ]
  );

  const sorting = useMemo(() => getSorting(sortField, direction), [sortField, direction]);

  const { createAssetCriticality, deleteAssetCriticality } = useEntityAnalyticsRoutes();

  const [isCriticalityModalVisible, toggleCriticalityModal] = useToggle(false);
  const criticality = useMutation<
    Array<AssetCriticalityRecord | DeleteAssetCriticalityResponse>,
    unknown,
    Params[],
    unknown
  >({
    mutationFn: (records) => {
      console.log('mutating records', records);
      const promises = records.map(({ criticalityLevel, idField, idValue }) => {
        if (criticalityLevel === 'unassigned') {
          return deleteAssetCriticality({ idField, idValue, refresh: 'wait_for' });
        }

        return createAssetCriticality({ idField, idValue, criticalityLevel, refresh: 'wait_for' });
      });

      return Promise.all(promises).then((results) => {
        console.log('results', results);
        return results;
      });
    },
    onSuccess: () => location.reload(),
  });

  const bulkAssignCriticality = (criticalityLevel: CriticalityLevelWithUnassigned) => {
    console.log('clicked');
    const obj = selected.map(buildCriticalityMutationParams(criticalityLevel));
    console.log('obj', obj);
    criticality.mutate(obj);
  };

  return (
    <>
      {isCriticalityModalVisible ? (
        <AssetCriticalityModal
          onSave={bulkAssignCriticality}
          initialCriticalityLevel={undefined}
          toggle={toggleCriticalityModal}
        />
      ) : null}
      <PaginatedTable
        activePage={activePage}
        columns={hostsColumns}
        dataTestSubj={`table-${tableType}`}
        headerCount={totalCount}
        headerTitle={i18n.HOSTS}
        headerUnit={i18n.UNIT(totalCount)}
        headerSupplement={
          selected.length > 0 ? (
            <EuiButton
              onClick={() => toggleCriticalityModal(true)}
              title={`Assign criticality to ${selected.length} selected items`}
            >{`Assign criticality to ${selected.length} selected items`}</EuiButton>
          ) : undefined
        }
        id={id}
        isInspect={isInspect}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadPage={loadPage}
        onChange={onChange}
        pageOfItems={data}
        setQuerySkip={setQuerySkip}
        showMorePagesIndicator={showMorePagesIndicator}
        sorting={sorting}
        selection={{
          selected,
          onSelectionChange: (items) => setSelected(items as HostsEdges[]),
        }}
        itemId={(item: HostsEdges) => item.node._id}
        totalCount={fakeTotalCount}
        updateLimitPagination={updateLimitPagination}
        updateActivePage={updateActivePage}
      />
    </>
  );
};

HostsTableComponent.displayName = 'HostsTableComponent';

const getSortField = (field: string): HostsFields => {
  switch (field) {
    case 'node.host.name':
      return HostsFields.hostName;
    case 'node.lastSeen':
      return HostsFields.lastSeen;
    default:
      return HostsFields.lastSeen;
  }
};

const getNodeField = (field: HostsFields): string => {
  switch (field) {
    case HostsFields.hostName:
      return 'node.host.name';
    case HostsFields.lastSeen:
      return 'node.lastSeen';
    default:
      return '';
  }
};

export const HostsTable = React.memo(HostsTableComponent);

HostsTable.displayName = 'HostsTable';

const buildCriticalityMutationParams =
  (criticalityLevel: Params['criticalityLevel']) =>
  (edge: HostsEdges): Params => {
    return {
      idField: 'host.name',
      idValue: edge.node.host?.name?.[0] || '',
      criticalityLevel,
    };
  };
