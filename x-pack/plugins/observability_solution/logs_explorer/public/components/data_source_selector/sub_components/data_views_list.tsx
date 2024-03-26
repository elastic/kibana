/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import styled from '@emotion/styled';
import React from 'react';
import { dataViewsLabel, DATA_VIEWS_PANEL_ID } from '../constants';

interface DataViewListProps extends React.HTMLAttributes<HTMLElement> {
  items: EuiContextMenuPanelItemDescriptor[];
}

export function DataViewList({ children, items, ...props }: DataViewListProps) {
  return (
    <div {...props}>
      {children}
      <ContextMenu
        initialPanelId={DATA_VIEWS_PANEL_ID}
        className="eui-yScroll"
        data-test-subj="dataViewsContextMenu"
        size="s"
        panels={[
          {
            id: DATA_VIEWS_PANEL_ID,
            title: dataViewsLabel,
            width: '100%',
            items,
          },
        ]}
      />
    </div>
  );
}

const ContextMenu = styled(EuiContextMenu)`
  max-height: 440px;
  transition: none !important;
`;
