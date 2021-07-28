/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiTableRowCell } from '@elastic/eui';
import { GlobalFlyout } from '../../../../../shared_imports';
import { EnrichedDeprecationInfo } from '../../../../../../common/types';
import { DeprecationTableColumns } from '../../../types';
import { EsDeprecationsTableCells } from '../../es_deprecations_table_cells';
import { DefaultDeprecationFlyout, DefaultDeprecationFlyoutProps } from './flyout';

const { useGlobalFlyout } = GlobalFlyout;

interface Props {
  rowFieldNames: DeprecationTableColumns[];
  deprecation: EnrichedDeprecationInfo;
}

export const DefaultTableRow: React.FunctionComponent<Props> = ({ rowFieldNames, deprecation }) => {
  const [showFlyout, setShowFlyout] = useState<boolean | undefined>(false);

  const {
    addContent: addContentToGlobalFlyout,
    removeContent: removeContentFromGlobalFlyout,
  } = useGlobalFlyout();

  useEffect(() => {
    if (showFlyout) {
      addContentToGlobalFlyout<DefaultDeprecationFlyoutProps>({
        id: 'deprecationDetails',
        Component: DefaultDeprecationFlyout,
        props: {
          deprecation,
          closeFlyout: () => setShowFlyout(false),
        },
        flyoutProps: {
          onClose: () => setShowFlyout(false),
          'data-test-subj': 'defaultDeprecationDetails',
          'aria-labelledby': 'defaultDeprecationDetailsFlyoutTitle',
        },
      });
    }
  }, [addContentToGlobalFlyout, deprecation, showFlyout]);

  useEffect(() => {
    if (showFlyout === false) {
      removeContentFromGlobalFlyout('deprecationDetails');
    }
  }, [showFlyout, removeContentFromGlobalFlyout]);

  return (
    <>
      {rowFieldNames.map((field) => {
        return (
          <EuiTableRowCell
            key={field}
            truncateText={false}
            data-test-subj={`defaultTableCell-${field}`}
          >
            <EsDeprecationsTableCells
              fieldName={field}
              openFlyout={() => setShowFlyout(true)}
              deprecation={deprecation}
            />
          </EuiTableRowCell>
        );
      })}
    </>
  );
};
