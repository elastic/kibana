/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGrid, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useContext } from 'react';
import { ThemeContext } from 'styled-components';
import { Alert } from '../../../../../alerts/common';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useHasData } from '../../../hooks/use_has_data';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { getEmptySections } from '../../../pages/overview/empty_section';
import { UXHasDataResponse } from '../../../typings';
import { EmptySection } from './empty_section';

export function EmptySections() {
  const { core } = usePluginContext();
  const theme = useContext(ThemeContext);
  const { hasData } = useHasData();

  const appEmptySections = getEmptySections({ core }).filter(({ id }) => {
    if (id === 'alert') {
      const { status, hasData: alerts } = hasData.alert || {};
      return (
        status === FETCH_STATUS.FAILURE ||
        (status === FETCH_STATUS.SUCCESS && (alerts as Alert[]).length === 0)
      );
    } else {
      const app = hasData[id];
      if (app) {
        const _hasData = id === 'ux' ? (app.hasData as UXHasDataResponse)?.hasData : app.hasData;
        return app.status === FETCH_STATUS.FAILURE || !_hasData;
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
                border: `1px dashed ${theme.eui.euiBorderColor}`,
                borderRadius: '4px',
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
