/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import type { PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { useUrlParams } from '../../../../hooks';
import { GroupMenu } from './group_menu';
import { ConfigKey } from '../../../../../../../common/runtime_types';

import { selectOverviewState, setOverviewGroupByAction } from '../../../../state/overview';

export const GroupFields = ({ onGroupChange }: { onGroupChange?: () => void }) => {
  const {
    groupBy: { field: groupField, order: groupOrder },
  } = useSelector(selectOverviewState);
  const dispatch = useDispatch();
  const [urlParams, updateUrlParams] = useUrlParams();

  const { groupBy: urlGroupField } = urlParams();

  useEffect(() => {
    if (urlGroupField && urlGroupField !== groupField) {
      dispatch(
        setOverviewGroupByAction({
          field: urlGroupField,
          order: 'asc',
        })
      );
    }
  }, [dispatch, groupField, urlGroupField]);

  const handleGroupChange = (payloadAction: PayloadAction<unknown>) => {
    dispatch(payloadAction);
  };

  const groupByOptions = [
    {
      label: NONE_LABEL,
      value: 'none',
      checked: groupField === 'none',
      defaultSortOrder: 'asc',
      onClick: () => {
        handleGroupChange(
          setOverviewGroupByAction({
            field: 'none',
            order: 'asc',
          })
        );
        updateUrlParams({ groupBy: 'none' });
      },
    },
    {
      label: LOCATION_LABEL,
      value: 'location.id',
      checked: groupField === 'locationId',
      defaultSortOrder: 'asc',
      onClick: () => {
        handleGroupChange(
          setOverviewGroupByAction({
            field: 'locationId',
            order: 'asc',
          })
        );
        updateUrlParams({ groupBy: 'locationId' });
      },
    },
    {
      label: MONITOR_TYPE_LABEL,
      value: ConfigKey.MONITOR_TYPE,
      checked: groupField === ConfigKey.MONITOR_TYPE,
      defaultSortOrder: 'desc',
      onClick: () => {
        handleGroupChange(
          setOverviewGroupByAction({
            field: ConfigKey.MONITOR_TYPE,
            order: 'desc',
          })
        );
        updateUrlParams({ groupBy: ConfigKey.MONITOR_TYPE });
      },
    },
    {
      label: TAG_LABEL,
      value: ConfigKey.TAGS,
      checked: groupField === ConfigKey.TAGS,
      defaultSortOrder: 'desc',
      onClick: () => {
        handleGroupChange(
          setOverviewGroupByAction({
            field: ConfigKey.TAGS,
            order: 'desc',
          })
        );
        updateUrlParams({ groupBy: ConfigKey.TAGS });
      },
    },
    {
      label: PROJECT_LABEL,
      value: ConfigKey.PROJECT_ID,
      checked: groupField === ConfigKey.PROJECT_ID,
      defaultSortOrder: 'desc',
      onClick: () => {
        handleGroupChange(
          setOverviewGroupByAction({
            field: ConfigKey.PROJECT_ID,
            order: 'desc',
          })
        );
        updateUrlParams({ groupBy: ConfigKey.PROJECT_ID });
      },
    },
  ];

  const { asc, desc, label } = getOrderContent(groupField);

  const orderByOptions = [
    {
      label: asc,
      value: 'asc',
      checked: groupOrder === 'asc',
      onClick: () => {
        handleGroupChange(
          setOverviewGroupByAction({
            order: 'asc',
            field: groupField,
          })
        );
      },
    },
    {
      label: desc,
      value: 'desc',
      checked: groupOrder === 'desc',
      onClick: () => {
        handleGroupChange(
          setOverviewGroupByAction({
            order: 'desc',
            field: groupField,
          })
        );
      },
    },
  ];

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} gutterSize="none" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxxs">
              <span>{GROUP_TITLE}</span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false} data-test-subj="syntheticsOverviewGroupButton">
            <GroupMenu
              groupOptions={groupByOptions}
              orderByOptions={orderByOptions}
              groupField={label}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const getOrderContent = (groupField: string) => {
  switch (groupField) {
    case 'locationId':
      return {
        asc: SORT_ALPHABETICAL_ASC,
        desc: SORT_ALPHABETICAL_DESC,
        label: LOCATION_LABEL,
      };
    case ConfigKey.MONITOR_TYPE:
      return {
        asc: SORT_ALPHABETICAL_ASC,
        desc: SORT_ALPHABETICAL_DESC,
        label: MONITOR_TYPE_LABEL,
      };
    case ConfigKey.TAGS:
      return {
        asc: SORT_ALPHABETICAL_ASC,
        desc: SORT_ALPHABETICAL_DESC,
        label: TAG_LABEL,
      };
    case ConfigKey.PROJECT_ID:
      return {
        asc: SORT_ALPHABETICAL_ASC,
        desc: SORT_ALPHABETICAL_DESC,
        label: PROJECT_LABEL,
      };
    default:
      return {
        asc: ASCENDING_LABEL,
        desc: DESCENDING_LABEL,
        label: NONE_LABEL,
      };
  }
};

export const GROUP_TITLE = i18n.translate('xpack.synthetics.overview.groupPopover.group.title', {
  defaultMessage: 'Group by',
});

const SORT_ALPHABETICAL_ASC = i18n.translate(
  'xpack.synthetics.overview.groupPopover.alphabetical.asc',
  {
    defaultMessage: 'A -> Z',
    description: 'Describes ascending alphabetical sort order',
  }
);

const SORT_ALPHABETICAL_DESC = i18n.translate(
  'xpack.synthetics.overview.groupPopover.alphabetical.desc',
  {
    defaultMessage: 'Z -> A',
    description: 'Describes descending alphabetical sort order',
  }
);

const ASCENDING_LABEL = i18n.translate('xpack.synthetics.overview.groupPopover.ascending.label', {
  defaultMessage: 'Ascending',
});

const DESCENDING_LABEL = i18n.translate('xpack.synthetics.overview.groupPopover.descending.label', {
  defaultMessage: 'Descending',
});

const NONE_LABEL = i18n.translate('xpack.synthetics.overview.groupPopover.none.label', {
  defaultMessage: 'None',
});

const LOCATION_LABEL = i18n.translate('xpack.synthetics.overview.groupPopover.location.label', {
  defaultMessage: 'Location',
});

const MONITOR_TYPE_LABEL = i18n.translate(
  'xpack.synthetics.overview.groupPopover.monitorType.label',
  {
    defaultMessage: 'Monitor type',
  }
);

const TAG_LABEL = i18n.translate('xpack.synthetics.overview.groupPopover.tag.label', {
  defaultMessage: 'Tag',
});

const PROJECT_LABEL = i18n.translate('xpack.synthetics.overview.groupPopover.project.label', {
  defaultMessage: 'Project',
});
