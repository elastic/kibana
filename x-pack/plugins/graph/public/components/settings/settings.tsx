/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EuiFlyoutHeader, EuiTitle, EuiTabs, EuiFlyoutBody, EuiTab } from '@elastic/eui';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { AdvancedSettingsForm } from './advanced_settings_form';
import { BlocklistForm } from './blocklist_form';
import { UrlTemplateList } from './url_template_list';
import { WorkspaceNode, AdvancedSettings, UrlTemplate, WorkspaceField } from '../../types';
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
    title: i18n.translate('xpack.graph.settings.blocklistTitle', { defaultMessage: 'Block list' }),
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

export interface SettingsProps {
  blocklistedNodes?: WorkspaceNode[];
  unblocklistNode?: (node: WorkspaceNode) => void;
  canEditDrillDownUrls: boolean;
}

export interface SettingsStateProps extends SettingsProps, StateProps, DispatchProps {}

export function SettingsComponent({
  canEditDrillDownUrls,
  blocklistedNodes,
  unblocklistNode,
  advancedSettings,
  urlTemplates,
  allFields,
}: SettingsStateProps & SettingsProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (!blocklistedNodes || !unblocklistNode) {
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
            .filter(({ id }) => id !== 'drillDowns' || canEditDrillDownUrls)
            .map(({ title }, index) => (
              <EuiTab
                key={title}
                isSelected={activeTab === index}
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
          blocklistedNodes={blocklistedNodes}
          unblocklistNode={unblocklistNode}
          advancedSettings={advancedSettings}
          urlTemplates={urlTemplates}
          allFields={allFields}
          updateSettings={updateSettings}
          removeTemplate={removeTemplate}
          saveTemplate={saveTemplate}
        />
      </EuiFlyoutBody>
    </>
  );
}

export const Settings = connect<StateProps, DispatchProps, SettingsProps, GraphState>(
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
