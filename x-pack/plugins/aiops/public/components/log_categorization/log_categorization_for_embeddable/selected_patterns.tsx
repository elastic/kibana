/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import { useState } from 'react';
import React from 'react';
import {
  EuiDataGridToolbarControl,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { QUERY_MODE } from '@kbn/aiops-log-pattern-analysis/get_category_query';
import type { OpenInDiscover } from '../category_table/use_open_in_discover';

export const SelectedPatterns: FC<{ openInDiscover: OpenInDiscover }> = ({ openInDiscover }) => {
  const { labels, openFunction } = openInDiscover;
  const [showMenu, setShowMenu] = useState(false);
  const togglePopover = () => setShowMenu(!showMenu);

  const button = (
    <EuiDataGridToolbarControl
      data-test-subj="aiopsEmbeddableMenuOptionsButton"
      iconType="documents"
      onClick={() => togglePopover()}
      badgeContent={openInDiscover.count}
    >
      <FormattedMessage
        id="xpack.aiops.logCategorization.selectedResultsButtonLabel"
        defaultMessage="Selected"
        description="Selected results"
      />
    </EuiDataGridToolbarControl>
  );

  return (
    <EuiPopover
      closePopover={() => setShowMenu(false)}
      isOpen={showMenu}
      panelPaddingSize="none"
      button={button}
      className="unifiedDataTableToolbarControlButton"
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="in"
            icon="plusInCircle"
            onClick={() => openFunction(QUERY_MODE.INCLUDE)}
          >
            {labels.multiSelect.in}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="out"
            icon="minusInCircle"
            onClick={() => openFunction(QUERY_MODE.EXCLUDE)}
          >
            {labels.multiSelect.out}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
