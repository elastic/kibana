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
import { ReindexStatusCell } from './status_table_cell';
import { ReindexFlyout, ReindexFlyoutProps } from './flyout';
import { ReindexStatusProvider, useReindexContext } from './context';

const { useGlobalFlyout } = GlobalFlyout;

interface TableRowProps {
  deprecation: EnrichedDeprecationInfo;
  rowFieldNames: DeprecationTableColumns[];
}

export const ReindexTableRowCells: React.FunctionComponent<TableRowProps> = ({
  rowFieldNames,
  deprecation,
}) => {
  const [showFlyout, setShowFlyout] = useState<boolean | undefined>(false);
  const reindexState = useReindexContext();

  const {
    addContent: addContentToGlobalFlyout,
    removeContent: removeContentFromGlobalFlyout,
  } = useGlobalFlyout();

  const closeFlyout = useCallback(() => setShowFlyout(false), []);

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
    if (showFlyout === false) {
      removeContentFromGlobalFlyout('reindexFlyout');
    }
  }, [showFlyout, removeContentFromGlobalFlyout]);

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
              statusTableCell={<ReindexStatusCell />}
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
