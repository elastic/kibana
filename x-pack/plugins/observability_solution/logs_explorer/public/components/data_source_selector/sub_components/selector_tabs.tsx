/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiTab, EuiTabs } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { PropsWithChildren, useContext } from 'react';
import {
  dataViewsLabel,
  DATA_VIEWS_TAB_ID,
  integrationsLabel,
  INTEGRATIONS_TAB_ID,
} from '../constants';
import { TabId } from '../types';
import { AddDataButton } from './add_data_button';

const tabsStyle = css`
  padding: 0 ${euiThemeVars.euiSizeS};
`;

interface DataSourceSelectorTabProps {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

const TabIdContext = React.createContext(INTEGRATIONS_TAB_ID);

const actions = {
  [DATA_VIEWS_TAB_ID]: [],
  [INTEGRATIONS_TAB_ID]: [<AddDataButton key="dataSourceSelectorIntegrationsAddData" />],
};

export function DataSourceSelectorTabs({ children, tabId }: PropsWithChildren<{ tabId: TabId }>) {
  const tabActions = actions[tabId];

  return (
    <TabIdContext.Provider value={tabId}>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiTabs css={tabsStyle} bottomBorder={false}>
          {children}
        </EuiTabs>
        {tabActions}
      </EuiFlexGroup>
    </TabIdContext.Provider>
  );
}

DataSourceSelectorTabs.DataViews = DataViews;
DataSourceSelectorTabs.Integrations = Integrations;

function DataViews({ onClick }: DataSourceSelectorTabProps) {
  const tabId = useContext(TabIdContext);

  return (
    <EuiTab
      isSelected={tabId === DATA_VIEWS_TAB_ID}
      data-test-subj="dataSourceSelectorDataViewsTab"
      onClick={onClick}
    >
      {dataViewsLabel}
    </EuiTab>
  );
}

function Integrations({ onClick }: DataSourceSelectorTabProps) {
  const tabId = useContext(TabIdContext);

  return (
    <EuiTab
      isSelected={tabId === INTEGRATIONS_TAB_ID}
      data-test-subj="dataSourceSelectorIntegrationsTab"
      onClick={onClick}
    >
      {integrationsLabel}
    </EuiTab>
  );
}
