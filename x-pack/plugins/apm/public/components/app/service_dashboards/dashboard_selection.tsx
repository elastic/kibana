/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiComboBox,
  EuiFlexItem,
  EuiComboBoxOptionOption,
  EuiButtonIcon,
} from '@elastic/eui';

import { isEmpty } from 'lodash';

import React, { useState, useEffect } from 'react';
import { AddDashboardModal } from './add_dashboard_modal';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { UnlinkDashboardModal } from './unlink_dashboard_modal';
import { DashboardLink } from './dashboard_link';

export function DashboardSelection({
  showAddDashboardModal,
  onHideAddDashboardModal,
  onSelectionChanged,
}: {
  showAddDashboardModal: boolean;
  onHideAddDashboardModal: () => void;
  onSelectionChanged?: (selection: DashboardLink | undefined) => void;
}) {
  const [selectedOption, setSelectedOption] = useState<DashboardLink>();
  const [dashboardOptions, setDashboardOptions] = useState<DashboardLink[]>([]);
  const [dashboardToUnlink, setDashboardToUnlink] = useState<DashboardLink>();

  const { serviceName } = useApmServiceContext();

  useEffect(() => {
    if (onSelectionChanged) {
      onSelectionChanged(selectedOption);
    }
  }, [onSelectionChanged, selectedOption]);

  useEffect(() => {
    if (isEmpty(dashboardOptions)) {
      setSelectedOption(undefined);
    } else {
      setSelectedOption(dashboardOptions[0]);
    }
  }, [dashboardOptions]);

  const { refetch } = useFetcher(
    async (callApmApi) => {
      const { dashboardMappings } = await callApmApi(
        'GET /internal/apm/services/{serviceName}/dashboards',
        {
          params: {
            path: { serviceName },
          },
        }
      );

      setDashboardOptions(
        dashboardMappings.map((dm) => ({
          value: dm.id,
          label: dm.dashboardName,
          dashboardMapping: dm,
        }))
      );
    },
    [serviceName]
  );

  const renderOption = (option: EuiComboBoxOptionOption<string>) => {
    const dashboardOption = dashboardOptions.find(
      (opt) => opt.value === option.value
    );

    return dashboardOption ? (
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={true}>{dashboardOption?.label}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            onClick={(e: any) => {
              e.stopPropagation();
              setDashboardToUnlink(dashboardOption);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      <></>
    );
  };

  return (
    <>
      <EuiComboBox
        fullWidth
        placeholder="Select dashboard"
        options={dashboardOptions}
        isDisabled={isEmpty(dashboardOptions)}
        singleSelection={{ asPlainText: true }}
        selectedOptions={selectedOption ? [selectedOption] : []}
        onChange={(e) => {
          if (isEmpty(e) || !e[0]) {
            setSelectedOption(undefined);
          } else {
            setSelectedOption(
              dashboardOptions.find((opt) => opt.value === e[0].value)
            );
          }
        }}
        renderOption={renderOption}
      />
      {showAddDashboardModal && (
        <EuiFlexItem grow={false}>
          <AddDashboardModal
            dashboardIdsToExclude={dashboardOptions.map(
              (d) => d.dashboardMapping.dashboardId
            )}
            onAddDashboard={() => {
              refetch();
            }}
            onHide={() => onHideAddDashboardModal()}
          />
        </EuiFlexItem>
      )}
      {dashboardToUnlink && (
        <UnlinkDashboardModal
          dashboardMapping={dashboardToUnlink}
          onClose={() => setDashboardToUnlink(undefined)}
          onUnlinked={() => refetch()}
        />
      )}
    </>
  );
}
