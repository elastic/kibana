/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenu, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { DATA_VIEWS_PANEL_ID } from '../constants';
import { tabContentHeight } from '../shared_styles';

interface DataViewListProps extends React.HTMLAttributes<HTMLElement> {
  items: EuiContextMenuPanelItemDescriptor[];
}

export function DataViewList({ children, items, ...props }: DataViewListProps) {
  return (
    <div {...props}>
      {children}
      <EuiContextMenu
        initialPanelId={DATA_VIEWS_PANEL_ID}
        className="eui-yScroll"
        data-test-subj="dataViewsContextMenu"
        size="s"
        css={contextMenuStyle}
        panels={[
          {
            id: DATA_VIEWS_PANEL_ID,
            width: '100%',
            items,
          },
        ]}
      />
    </div>
  );
}

const contextMenuStyle = css`
  ${tabContentHeight}
  transition: none !important;
`;
