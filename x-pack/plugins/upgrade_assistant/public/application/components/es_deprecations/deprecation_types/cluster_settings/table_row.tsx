/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { EuiTableRowCell } from '@elastic/eui';
import { EnrichedDeprecationInfo, ResponseError } from '../../../../../../common/types';
import { GlobalFlyout } from '../../../../../shared_imports';
import { useAppContext } from '../../../../app_context';
import { EsDeprecationsTableCells } from '../../es_deprecations_table_cells';
import { DeprecationTableColumns, Status } from '../../../types';
import { ClusterSettingsResolutionCell } from './resolution_table_cell';
import { RemoveClusterSettingsFlyout, RemoveClusterSettingsFlyoutProps } from './flyout';

const { useGlobalFlyout } = GlobalFlyout;

interface Props {
  deprecation: EnrichedDeprecationInfo;
  rowFieldNames: DeprecationTableColumns[];
}

export const ClusterSettingsTableRow: React.FunctionComponent<Props> = ({
  rowFieldNames,
  deprecation,
}) => {
  const [showFlyout, setShowFlyout] = useState(false);
  const [status, setStatus] = useState<{
    statusType: Status;
    details?: ResponseError;
  }>({ statusType: 'idle' });

  const {
    services: { api },
  } = useAppContext();

  const { addContent: addContentToGlobalFlyout, removeContent: removeContentFromGlobalFlyout } =
    useGlobalFlyout();

  const closeFlyout = useCallback(() => {
    setShowFlyout(false);
    removeContentFromGlobalFlyout('clusterSettingsFlyout');
  }, [removeContentFromGlobalFlyout]);

  const removeClusterSettings = useCallback(
    async (settings: string[]) => {
      setStatus({ statusType: 'in_progress' });

      const { error } = await api.updateClusterSettings(settings);

      setStatus({
        statusType: error ? 'error' : 'complete',
        details: error ?? undefined,
      });
      closeFlyout();
    },
    [api, closeFlyout]
  );

  useEffect(() => {
    if (showFlyout) {
      addContentToGlobalFlyout<RemoveClusterSettingsFlyoutProps>({
        id: 'clusterSettingsFlyout',
        Component: RemoveClusterSettingsFlyout,
        props: {
          closeFlyout,
          deprecation,
          removeClusterSettings,
          status,
        },
        flyoutProps: {
          onClose: closeFlyout,
          className: 'eui-textBreakWord',
          'data-test-subj': 'clusterSettingsDetails',
          'aria-labelledby': 'removeClusterSettingsDetailsFlyoutTitle',
        },
      });
    }
  }, [
    addContentToGlobalFlyout,
    deprecation,
    removeClusterSettings,
    showFlyout,
    closeFlyout,
    status,
  ]);

  return (
    <>
      {rowFieldNames.map((field: DeprecationTableColumns) => {
        return (
          <EuiTableRowCell
            key={field}
            truncateText={false}
            data-test-subj={`clusterSettingsTableCell-${field}`}
          >
            <EsDeprecationsTableCells
              fieldName={field}
              openFlyout={() => setShowFlyout(true)}
              deprecation={deprecation}
              resolutionTableCell={<ClusterSettingsResolutionCell status={status} />}
            />
          </EuiTableRowCell>
        );
      })}
    </>
  );
};
