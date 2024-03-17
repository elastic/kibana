/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { EuiFlyoutHeader, EuiTitle, EuiTabs, EuiFlyoutBody, EuiTab } from '@elastic/eui';
import * as Rx from 'rxjs';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { AdvancedSettingsForm } from './advanced_settings_form';
import { BlocklistForm } from './blocklist_form';
import { UrlTemplateList } from './url_template_list';
import { AdvancedSettings, BlockListedNode, UrlTemplate, WorkspaceField } from '../../types';
import {
  GraphState,
  settingsSelector,
  templatesSelector,
  fieldsSelector,
  updateSettings,
  saveTemplate,
  removeTemplate,
} from '../../state_management';

const tabs = [
  {
    id: 'advancedSettings',
    title: i18n.translate('xpack.graph.settings.advancedSettingsTitle', {
      defaultMessage: 'Advanced settings',
    }),
    component: AdvancedSettingsForm,
  },
  {
    id: 'blocklist',
    title: i18n.translate('xpack.graph.settings.blocklistTitle', { defaultMessage: 'Hidden list' }),
    component: BlocklistForm,
  },
  {
    id: 'drillDowns',
    title: i18n.translate('xpack.graph.settings.drillDownsTitle', {
      defaultMessage: 'Drilldowns',
    }),
    component: UrlTemplateList,
  },
];

export interface StateProps {
  advancedSettings: AdvancedSettings;
  urlTemplates: UrlTemplate[];
  allFields: WorkspaceField[];
}

export interface DispatchProps {
  updateSettings: (advancedSettings: AdvancedSettings) => void;
  removeTemplate: (urlTemplate: UrlTemplate) => void;
  saveTemplate: (props: { index: number; template: UrlTemplate }) => void;
}

export interface SettingsWorkspaceProps {
  blocklistedNodes: BlockListedNode[];
  unblockNode: (node: BlockListedNode) => void;
  unblockAll: () => void;
  canEditDrillDownUrls: boolean;
}

export interface AsObservable<P> {
  observable: Readonly<Rx.Observable<P>>;
}

export interface SettingsStateProps extends StateProps, DispatchProps {}

export function SettingsComponent({
  observable,
  advancedSettings,
  urlTemplates,
  allFields,
  saveTemplate: saveTemplateAction,
  updateSettings: updateSettingsAction,
  removeTemplate: removeTemplateAction,
}: AsObservable<SettingsWorkspaceProps> & SettingsStateProps) {
  const [workspaceProps, setWorkspaceProps] = useState<SettingsWorkspaceProps | undefined>(
    undefined
  );
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    observable.subscribe(setWorkspaceProps);
  }, [observable]);

  if (!workspaceProps) {
    return null;
  }

  const ActiveTabContent = tabs[activeTab].component;

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{i18n.translate('xpack.graph.settings.title', { defaultMessage: 'Settings' })}</h2>
        </EuiTitle>
        <EuiTabs style={{ margin: '0 -16px -25px' }}>
          {tabs
            .filter(({ id }) => id !== 'drillDowns' || workspaceProps.canEditDrillDownUrls)
            .map(({ title, id }, index) => (
              <EuiTab
                key={title}
                isSelected={activeTab === index}
                data-test-subj={id}
                onClick={() => {
                  setActiveTab(index);
                }}
              >
                {title}
              </EuiTab>
            ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ActiveTabContent
          blocklistedNodes={workspaceProps.blocklistedNodes}
          unblockNode={workspaceProps.unblockNode}
          unblockAll={workspaceProps.unblockAll}
          advancedSettings={advancedSettings}
          urlTemplates={urlTemplates}
          allFields={allFields}
          updateSettings={updateSettingsAction}
          removeTemplate={removeTemplateAction}
          saveTemplate={saveTemplateAction}
        />
      </EuiFlyoutBody>
    </>
  );
}

export const Settings = connect<
  StateProps,
  DispatchProps,
  AsObservable<SettingsWorkspaceProps>,
  GraphState
>(
  (state: GraphState) => ({
    advancedSettings: settingsSelector(state),
    urlTemplates: templatesSelector(state),
    allFields: fieldsSelector(state),
  }),
  (dispatch) =>
    bindActionCreators(
      {
        updateSettings,
        saveTemplate,
        removeTemplate,
      },
      dispatch
    )
)(SettingsComponent);
