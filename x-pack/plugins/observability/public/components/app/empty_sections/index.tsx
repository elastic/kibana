/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { Alert } from '../../../../../alerting/common';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useHasData } from '../../../hooks/use_has_data';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { getEmptySections } from '../../../pages/overview/empty_section';
import { EmptySection } from './empty_section';

export function EmptySections() {
  const { core } = usePluginContext();
  const theme = useContext(ThemeContext);
  const { hasDataMap } = useHasData();

  const appEmptySections = getEmptySections({ core }).filter(({ id }) => {
    if (id === 'alert') {
      const { status, hasData: alerts } = hasDataMap.alert || {};
      return (
        status === FETCH_STATUS.FAILURE ||
        (status === FETCH_STATUS.SUCCESS && (alerts as Alert[]).length === 0)
      );
    } else {
      const app = hasDataMap[id];
      if (app) {
        return app.status === FETCH_STATUS.FAILURE || !app.hasData;
      }
    }
    return false;
  });
  return (
    <EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiFlexGrid
        columns={
          // when more than 2 empty sections are available show them on 2 columns, otherwise 1
          appEmptySections.length > 2 ? 2 : 1
        }
        gutterSize="s"
      >
        {appEmptySections.map((app) => {
          return (
            <EuiFlexItem
              key={app.id}
              style={{
                border: `${theme.eui.euiBorderEditable}`,
                borderRadius: `${theme.eui.euiBorderRadius}`,
              }}
            >
              <EmptySection section={app} />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
    </EuiFlexItem>
  );
}
