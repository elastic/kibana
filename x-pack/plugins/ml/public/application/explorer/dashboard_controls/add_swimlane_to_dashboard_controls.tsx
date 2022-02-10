/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useState } from 'react';
import {
  EuiFormRow,
  EuiInMemoryTableProps,
  EuiSpacer,
  EuiRadioGroup,
  htmlIdGenerator,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
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
    title: getDefaultSwimlanePanelTitle(jobIds),
    id: htmlIdGenerator()(),
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
  const { dashboardItems, isLoading, search } = useDashboardTable();

  const [selectedSwimlane, setSelectedSwimlane] = useState<SwimlaneType>(SWIMLANE_TYPE.OVERALL);

  const getEmbeddableInput = useCallback(() => {
    const config = getDefaultEmbeddablePanelConfig(jobIds);

    return {
      ...config,
      jobIds,
      swimlaneType: selectedSwimlane,
      ...(selectedSwimlane === SWIMLANE_TYPE.VIEW_BY ? { viewBy } : {}),
    };
  }, [selectedSwimlane]);

  const { addToDashboardAndEditCallback } = useAddToDashboardActions(
    ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
    getEmbeddableInput
  );

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
        <EuiRadioGroup
          options={swimlaneTypeOptions}
          idSelected={selectedSwimlane}
          onChange={(optionId) => {
            setSelectedSwimlane(optionId as SwimlaneType);
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
      defaultMessage="Add swim lane to a dashboard"
    />
  );

  return (
    <AddToDashboardControl
      onClose={onClose}
      dashboardItems={dashboardItems}
      isLoading={isLoading}
      search={search}
      addToDashboardAndEditCallback={addToDashboardAndEditCallback}
      disabled={false}
      title={title}
    >
      {extraControls}
    </AddToDashboardControl>
  );
};
