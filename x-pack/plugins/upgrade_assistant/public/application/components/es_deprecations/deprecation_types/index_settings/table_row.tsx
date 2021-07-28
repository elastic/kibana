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
import { EsDeprecationsTableCells } from '../../es_deprecations_table_cells';
import { DeprecationTableColumns } from '../../../types';
import { IndexSettingsStatusCell } from './status_table_cell';
import { RemoveIndexSettingsFlyout, RemoveIndexSettingsFlyoutProps } from './flyout';

const { useGlobalFlyout } = GlobalFlyout;

interface Props {
  deprecation: EnrichedDeprecationInfo;
  rowFieldNames: DeprecationTableColumns[];
}

export type Status = 'in_progress' | 'complete' | 'idle' | 'error';

export const IndexSettingsTableRow: React.FunctionComponent<Props> = ({
  rowFieldNames,
  deprecation,
}) => {
  const [showFlyout, setShowFlyout] = useState<boolean | undefined>(false);
  const [status, setStatus] = useState<Status>('idle');

  const { api } = useAppContext();

  const closeFlyout = useCallback(() => setShowFlyout(false), []);

  const removeIndexSettings = useCallback(
    async (index: string, settings: string[]) => {
      setStatus('in_progress');

      const { error } = await api.updateIndexSettings(index, settings);

      setStatus(error ? 'error' : 'complete');
      closeFlyout();
    },
    [api, closeFlyout]
  );

  const {
    addContent: addContentToGlobalFlyout,
    removeContent: removeContentFromGlobalFlyout,
  } = useGlobalFlyout();

  useEffect(() => {
    if (showFlyout) {
      addContentToGlobalFlyout<RemoveIndexSettingsFlyoutProps>({
        id: 'indexSettingsFlyout',
        Component: RemoveIndexSettingsFlyout,
        props: {
          closeFlyout,
          deprecation,
          removeIndexSettings,
        },
        flyoutProps: {
          onClose: closeFlyout,
          'data-test-subj': 'indexSettingsDetails',
          'aria-labelledby': 'indexSettingsDetailsFlyoutTitle',
        },
      });
    }
  }, [addContentToGlobalFlyout, deprecation, removeIndexSettings, showFlyout, closeFlyout]);

  useEffect(() => {
    if (showFlyout === false) {
      removeContentFromGlobalFlyout('indexSettingsFlyout');
    }
  }, [showFlyout, removeContentFromGlobalFlyout]);

  return (
    <>
      {rowFieldNames.map((field: DeprecationTableColumns) => {
        return (
          <EuiTableRowCell
            key={field}
            truncateText={false}
            data-test-subj={`indexSettingsTableCell-${field}`}
          >
            <EsDeprecationsTableCells
              fieldName={field}
              openFlyout={() => setShowFlyout(true)}
              deprecation={deprecation}
              statusTableCell={<IndexSettingsStatusCell status={status} />}
            />
          </EuiTableRowCell>
        );
      })}
    </>
  );
};
