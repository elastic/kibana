/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataViewFilterHandler } from '../types';
import { DataViewsFilterParams } from '../../../state_machines/data_views';
import {
  allDataViewTypesLabel,
  logsDataViewTypeLabel,
  selectDataViewTypeLabel,
} from '../constants';

interface DataViewFilterProps {
  onFilter: DataViewFilterHandler;
  count: number;
  filter: DataViewsFilterParams;
}

const logsDataViewType = 'logs';

function getSelectedFilterLabel(dataType: DataViewsFilterParams['dataType']) {
  const availableFilters = {
    [logsDataViewType]: logsDataViewTypeLabel,
  };

  return !dataType ? allDataViewTypesLabel : availableFilters[dataType];
}

export const DataViewsFilter = ({ count, filter, onFilter }: DataViewFilterProps) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const closeTypePopover = () => {
    setPopover(false);
  };

  const togglePopover = () => {
    setPopover(!isPopoverOpen);
  };

  const createSelectTypeFilter = (dataType: DataViewsFilterParams['dataType']) => {
    return () => {
      onFilter({ dataType });
      closeTypePopover();
    };
  };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="xs">
          {i18n.translate('xpack.logsExplorer.dataSourceSelector.dataViewCount', {
            defaultMessage: '{count, plural, one {# data view} other {# data views}}',
            values: { count },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonEmpty
              data-test-subj="logsExplorerDataSourceSelectorDataViewTypeButton"
              iconType="arrowDown"
              iconSide="right"
              size="xs"
              onClick={togglePopover}
            >
              {getSelectedFilterLabel(filter.dataType)}
            </EuiButtonEmpty>
          }
          isOpen={isPopoverOpen}
          closePopover={closeTypePopover}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenuPanel
            title={selectDataViewTypeLabel}
            size="s"
            items={[
              <EuiContextMenuItem
                data-test-subj="logsExplorerDataSourceSelectorDataViewTypeAll"
                icon={!filter.dataType ? 'check' : 'empty'}
                onClick={createSelectTypeFilter(undefined)}
              >
                {allDataViewTypesLabel}
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                data-test-subj="logsExplorerDataSourceSelectorDataViewTypeLogs"
                icon={filter.dataType === logsDataViewType ? 'check' : 'empty'}
                onClick={createSelectTypeFilter(logsDataViewType)}
              >
                {logsDataViewTypeLabel}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
