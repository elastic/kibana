/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './frame_layout.scss';

import React from 'react';
import { EuiPage, EuiPageBody, EuiScreenReaderOnly } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface FrameLayoutProps {
  dataPanel: React.ReactNode;
  configPanel?: React.ReactNode;
  suggestionsPanel?: React.ReactNode;
  workspacePanel?: React.ReactNode;
}

export function FrameLayout(props: FrameLayoutProps) {
  return (
    <EuiPage className="lnsFrameLayout">
      <EuiPageBody
        restrictWidth={false}
        className="lnsFrameLayout__pageContent"
        aria-labelledby="lns_ChartTitle"
      >
        <section className="lnsFrameLayout__sidebar" aria-labelledby="dataPanelId">
          <EuiScreenReaderOnly>
            <h2 id="dataPanelId">
              {i18n.translate('xpack.lens.section.dataPanelLabel', {
                defaultMessage: 'Data panel',
              })}
            </h2>
          </EuiScreenReaderOnly>
          {props.dataPanel}
        </section>
        <section className="lnsFrameLayout__pageBody" aria-labelledby="workspaceId">
          <EuiScreenReaderOnly>
            <h2 id="workspaceId">
              {i18n.translate('xpack.lens.section.workspaceLabel', {
                defaultMessage: 'Visualization workspace',
              })}
            </h2>
          </EuiScreenReaderOnly>
          {props.workspacePanel}
          {props.suggestionsPanel}
        </section>
        <section
          className="lnsFrameLayout__sidebar lnsFrameLayout__sidebar--right"
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
