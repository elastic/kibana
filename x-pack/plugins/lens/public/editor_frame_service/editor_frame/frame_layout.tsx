/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './frame_layout.scss';

import React from 'react';
import { EuiPage, EuiPageBody, EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';

export interface FrameLayoutProps {
  dataPanel: React.ReactNode;
  configPanel?: React.ReactNode;
  suggestionsPanel?: React.ReactNode;
  workspacePanel?: React.ReactNode;
  isFullscreen?: boolean;
}

export function FrameLayout(props: FrameLayoutProps) {
  return (
    <EuiPage
      className={classNames('lnsFrameLayout', {
        'lnsFrameLayout-isFullscreen': props.isFullscreen,
      })}
    >
      <EuiPageBody
        restrictWidth={false}
        className="lnsFrameLayout__pageContent"
        aria-labelledby="lns_ChartTitle"
      >
        <section
          className={classNames('lnsFrameLayout__sidebar lnsFrameLayout__sidebar--left', {})}
          aria-labelledby="dataPanelId"
        >
          <EuiScreenReaderOnly>
            <h2 id="dataPanelId">
              {i18n.translate('xpack.lens.section.dataPanelLabel', {
                defaultMessage: 'Data panel',
              })}
            </h2>
          </EuiScreenReaderOnly>
          {props.dataPanel}
        </section>
        <section
          className={classNames('lnsFrameLayout__pageBody', {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'lnsFrameLayout__pageBody-isFullscreen': props.isFullscreen,
          })}
          aria-labelledby="workspaceId"
        >
          <EuiScreenReaderOnly>
            <h2 id="workspaceId">
              {i18n.translate('xpack.lens.section.workspaceLabel', {
                defaultMessage: 'Visualization workspace',
              })}
            </h2>
          </EuiScreenReaderOnly>
          {props.workspacePanel}
          <div className="lnsFrameLayout__suggestionPanel">{props.suggestionsPanel}</div>
        </section>
        <section
          className={classNames('lnsFrameLayout__sidebar lnsFrameLayout__sidebar--right', {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'lnsFrameLayout__sidebar-isFullscreen': props.isFullscreen,
          })}
          aria-labelledby="configPanel"
        >
          <EuiScreenReaderOnly>
            <h2 id="configPanel">
              {i18n.translate('xpack.lens.section.configPanelLabel', {
                defaultMessage: 'Config panel',
              })}
            </h2>
          </EuiScreenReaderOnly>
          {props.configPanel}
        </section>
      </EuiPageBody>
    </EuiPage>
  );
}
