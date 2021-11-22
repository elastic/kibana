/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FC } from 'react';
import { EuiTabbedContent, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GeneralConfig } from './general_config';
import { FilterConfig } from './filter_config';

const strings = {
  getTitle: () =>
    i18n.translate('xpack.canvas.globalConfig.title', {
      defaultMessage: 'Workpad settings',
    }),
  getGeneralLabel: () =>
    i18n.translate('xpack.canvas.globalConfig.general', {
      defaultMessage: 'General',
    }),
  getFilterLabel: () =>
    i18n.translate('xpack.canvas.globalConfig.filter', {
      defaultMessage: 'Filter',
    }),
};

export const GlobalConfig: FC = () => {
  const tabs = [
    {
      id: 'general',
      name: strings.getGeneralLabel(),
      content: (
        <div className="canvasSidebar__pop">
          <EuiSpacer size="m" />
          <GeneralConfig />
        </div>
      ),
    },
    {
      id: 'filter',
      name: strings.getFilterLabel(),
      content: (
        <div className="canvasSidebar__pop">
          <FilterConfig />
        </div>
      ),
    },
  ];

  return (
    <Fragment>
      <div className="canvasLayout__sidebarHeader">
        <EuiTitle size="xs">
          <h4>{strings.getTitle()}</h4>
        </EuiTitle>
      </div>
      <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} size="s" />
    </Fragment>
  );
};
