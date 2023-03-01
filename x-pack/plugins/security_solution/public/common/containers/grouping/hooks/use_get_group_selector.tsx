/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldSpec } from '@kbn/data-views-plugin/common';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { GROUP_BY } from '../../../components/grouping/translations';
import type { TableId } from '../../../../../common/types';
import { getDefaultGroupingOptions } from '../../../../detections/components/alerts_table/grouping_settings';
import type { State } from '../../../store';
import { defaultGroup } from '../../../store/grouping/defaults';
import type { GroupOption } from '../../../store/grouping';
import { groupActions, groupSelectors } from '../../../store/grouping';
import { GroupsSelector, isNoneGroup } from '../../../components/grouping';

export interface UseGetGroupSelectorArgs {
  fields: FieldSpec[];
  groupingId: string;
  tableId: TableId;
}

export const useGetGroupingSelector = ({
  fields,
  groupingId,
  tableId,
}: UseGetGroupSelectorArgs) => {
  const dispatch = useDispatch();

  const getGroupByIdSelector = groupSelectors.getGroupByIdSelector();

  const { activeGroup: selectedGroup, options } =
    useSelector((state: State) => getGroupByIdSelector(state, groupingId)) ?? defaultGroup;

  const setGroupsActivePage = useCallback(
    (activePage: number) => {
      dispatch(groupActions.updateGroupActivePage({ id: groupingId, activePage }));
    },
    [dispatch, groupingId]
  );

  const setSelectedGroup = useCallback(
    (activeGroup: string) => {
      dispatch(groupActions.updateActiveGroup({ id: groupingId, activeGroup }));
    },
    [dispatch, groupingId]
  );

  const setOptions = useCallback(
    (newOptions: GroupOption[]) => {
      dispatch(groupActions.updateGroupOptions({ id: groupingId, newOptionList: newOptions }));
    },
    [dispatch, groupingId]
  );
  const defaultGroupingOptions = getDefaultGroupingOptions(tableId);

  useEffect(() => {
    if (options.length > 0) return;
    setOptions(
      defaultGroupingOptions.find((o) => o.key === selectedGroup)
        ? defaultGroupingOptions
        : [
            ...defaultGroupingOptions,
            ...(!isNoneGroup(selectedGroup)
              ? [
                  {
                    key: selectedGroup,
                    label: selectedGroup,
                  },
                ]
              : []),
          ]
    );
  }, [defaultGroupingOptions, selectedGroup, setOptions, options]);

  const groupsSelector = useMemo(
    () => (
      <GroupsSelector
        groupSelected={selectedGroup}
        data-test-subj="alerts-table-group-selector"
        onGroupChange={(groupSelection: string) => {
          if (groupSelection === selectedGroup) {
            return;
          }
          setGroupsActivePage(0);
          setSelectedGroup(groupSelection);

          if (!isNoneGroup(groupSelection) && !options.find((o) => o.key === groupSelection)) {
            setOptions([
              ...defaultGroupingOptions,
              {
                label: groupSelection,
                key: groupSelection,
              },
            ]);
          } else {
            setOptions(defaultGroupingOptions);
          }
        }}
        fields={fields}
        options={options}
        title={GROUP_BY}
      />
    ),
    [
      defaultGroupingOptions,
      fields,
      options,
      selectedGroup,
      setGroupsActivePage,
      setOptions,
      setSelectedGroup,
    ]
  );

  return groupsSelector;
};
