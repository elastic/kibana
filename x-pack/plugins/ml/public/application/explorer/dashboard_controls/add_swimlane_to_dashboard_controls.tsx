/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useState } from 'react';
import { EuiFormRow, EuiCheckboxGroup, EuiInMemoryTableProps, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { DashboardSavedObject } from '../../../../../../../src/plugins/dashboard/public';
import { getDefaultSwimlanePanelTitle } from '../../../embeddables/anomaly_swimlane/anomaly_swimlane_embeddable';
import { SWIMLANE_TYPE, SwimlaneType } from '../explorer_constants';
import { JobId } from '../../../../common/types/anomaly_detection_jobs';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../../../embeddables';
import { useDashboardTable } from './use_dashboards_table';
import { AddToDashboardControl } from './add_to_dashboard_controls';
import { useAddToDashboardActions } from './use_add_to_dashboard_actions';

export interface DashboardItem {
  id: string;
  title: string;
  description: string | undefined;
  attributes: DashboardSavedObject;
}

export type EuiTableProps = EuiInMemoryTableProps<DashboardItem>;

function getDefaultEmbeddablePanelConfig(jobIds: JobId[]) {
  return {
    type: ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
    title: getDefaultSwimlanePanelTitle(jobIds),
  };
}

interface AddToDashboardControlProps {
  jobIds: JobId[];
  viewBy: string;
  onClose: (callback?: () => Promise<void>) => void;
}

/**
 * Component for attaching anomaly swim lane embeddable to dashboards.
 */
export const AddSwimlaneToDashboardControl: FC<AddToDashboardControlProps> = ({
  onClose,
  jobIds,
  viewBy,
}) => {
  const { selectedItems, selection, dashboardItems, isLoading, search } = useDashboardTable();

  const [selectedSwimlanes, setSelectedSwimlanes] = useState<{ [key in SwimlaneType]: boolean }>({
    [SWIMLANE_TYPE.OVERALL]: true,
    [SWIMLANE_TYPE.VIEW_BY]: false,
  });

  const getPanelsData = useCallback(async () => {
    const swimlanes = Object.entries(selectedSwimlanes)
      .filter(([, isSelected]) => isSelected)
      .map(([swimlaneType]) => swimlaneType);

    return swimlanes.map((swimlaneType) => {
      const config = getDefaultEmbeddablePanelConfig(jobIds);
      if (swimlaneType === SWIMLANE_TYPE.VIEW_BY) {
        return {
          ...config,
          embeddableConfig: {
            jobIds,
            swimlaneType,
            viewBy,
          },
        };
      }
      return {
        ...config,
        embeddableConfig: {
          jobIds,
          swimlaneType,
        },
      };
    });
  }, [selectedSwimlanes, selectedItems]);
  const { addToDashboardAndEditCallback, addToDashboardCallback } = useAddToDashboardActions({
    onClose,
    getPanelsData,
    selectedDashboards: selectedItems,
  });

  const swimlaneTypeOptions = [
    {
      id: SWIMLANE_TYPE.OVERALL,
      label: i18n.translate('xpack.ml.explorer.overallLabel', {
        defaultMessage: 'Overall',
      }),
    },
    {
      id: SWIMLANE_TYPE.VIEW_BY,
      label: i18n.translate('xpack.ml.explorer.viewByFieldLabel', {
        defaultMessage: 'View by {viewByField}',
        values: { viewByField: viewBy },
      }),
    },
  ];

  const noSwimlaneSelected = Object.values(selectedSwimlanes).every((isSelected) => !isSelected);

  const extraControls = (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.explorer.addToDashboard.swimlanes.selectSwimlanesLabel"
            defaultMessage="Select swim lane view:"
          />
        }
      >
        <EuiCheckboxGroup
          options={swimlaneTypeOptions}
          idToSelectedMap={selectedSwimlanes}
          onChange={(optionId) => {
            const newSelection = {
              ...selectedSwimlanes,
              [optionId]: !selectedSwimlanes[optionId as SwimlaneType],
            };
            setSelectedSwimlanes(newSelection);
          }}
          data-test-subj="mlAddToDashboardSwimlaneTypeSelector"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </>
  );

  const title = (
    <FormattedMessage
      id="xpack.ml.explorer.addToDashboard.swimlanes.dashboardsTitle"
      defaultMessage="Add swim lanes to dashboards"
    />
  );

  const disabled = noSwimlaneSelected || selectedItems.length === 0;
  return (
    <AddToDashboardControl
      onClose={onClose}
      selectedItems={selectedItems}
      selection={selection}
      dashboardItems={dashboardItems}
      isLoading={isLoading}
      search={search}
      addToDashboardAndEditCallback={addToDashboardAndEditCallback}
      addToDashboardCallback={addToDashboardCallback}
      disabled={disabled}
      title={title}
    >
      {extraControls}
    </AddToDashboardControl>
  );
};
