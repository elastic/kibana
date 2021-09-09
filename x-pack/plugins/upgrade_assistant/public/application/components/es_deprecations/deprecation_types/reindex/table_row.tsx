/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { EuiTableRowCell } from '@elastic/eui';
import { EnrichedDeprecationInfo } from '../../../../../../common/types';
import { GlobalFlyout } from '../../../../../shared_imports';
import { useAppContext } from '../../../../app_context';
import { DeprecationTableColumns } from '../../../types';
import { EsDeprecationsTableCells } from '../../es_deprecations_table_cells';
import { ReindexResolutionCell } from './resolution_table_cell';
import { ReindexFlyout, ReindexFlyoutProps } from './flyout';
import { ReindexStatusProvider, useReindexContext } from './context';

const { useGlobalFlyout } = GlobalFlyout;

interface TableRowProps {
  deprecation: EnrichedDeprecationInfo;
  rowFieldNames: DeprecationTableColumns[];
}

const ReindexTableRowCells: React.FunctionComponent<TableRowProps> = ({
  rowFieldNames,
  deprecation,
}) => {
  const [showFlyout, setShowFlyout] = useState(false);
  const reindexState = useReindexContext();
  const { api } = useAppContext();

  const {
    addContent: addContentToGlobalFlyout,
    removeContent: removeContentFromGlobalFlyout,
  } = useGlobalFlyout();

  const closeFlyout = useCallback(async () => {
    removeContentFromGlobalFlyout('reindexFlyout');
    setShowFlyout(false);
    await api.sendReindexTelemetryData({ close: true });
  }, [api, removeContentFromGlobalFlyout]);

  useEffect(() => {
    if (showFlyout) {
      addContentToGlobalFlyout<ReindexFlyoutProps>({
        id: 'reindexFlyout',
        Component: ReindexFlyout,
        props: {
          deprecation,
          closeFlyout,
          ...reindexState,
        },
        flyoutProps: {
          onClose: closeFlyout,
          'data-test-subj': 'reindexDetails',
          'aria-labelledby': 'reindexDetailsFlyoutTitle',
        },
      });
    }
  }, [addContentToGlobalFlyout, deprecation, showFlyout, reindexState, closeFlyout]);

  useEffect(() => {
    if (showFlyout) {
      async function sendTelemetry() {
        await api.sendReindexTelemetryData({ open: true });
      }

      sendTelemetry();
    }
  }, [showFlyout, api]);

  return (
    <>
      {rowFieldNames.map((field: DeprecationTableColumns) => {
        return (
          <EuiTableRowCell
            key={field}
            truncateText={false}
            data-test-subj={`reindexTableCell-${field}`}
          >
            <EsDeprecationsTableCells
              fieldName={field}
              openFlyout={() => setShowFlyout(true)}
              deprecation={deprecation}
              resolutionTableCell={<ReindexResolutionCell />}
            />
          </EuiTableRowCell>
        );
      })}
    </>
  );
};

export const ReindexTableRow: React.FunctionComponent<TableRowProps> = (props) => {
  const { api } = useAppContext();

  return (
    <ReindexStatusProvider indexName={props.deprecation.index!} api={api}>
      <ReindexTableRowCells {...props} />
    </ReindexStatusProvider>
  );
};
