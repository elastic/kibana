/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { AppDependencies } from '../';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public';
import { UISession } from '../../../../common/search/sessions_mgmt';
import { SearchSessionsMgmtMain } from '../components/main';

export const renderApp = (
  elem: HTMLElement | null,
  { i18n, uiSettings, ...homeDeps }: AppDependencies,
  initialTable: UISession[] | null
) => {
  if (!elem) {
    return () => undefined;
  }

  const { Context: I18nContext } = i18n;
  // uiSettings is required by the listing table to format dates in the timezone from Settings
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings,
  });

  render(
    <I18nContext>
      <KibanaReactContextProvider>
        <SearchSessionsMgmtMain
          initialTable={initialTable}
          {...homeDeps}
          timezone={uiSettings.get('dateFormat:tz')}
        />
      </KibanaReactContextProvider>
    </I18nContext>,
    elem
  );

  return () => {
    unmountComponentAtNode(elem);
  };
};
