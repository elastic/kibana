/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect } from 'react';
import { EuiFlyoutHeader, EuiTitle, EuiTabs, EuiFlyoutBody, EuiTab } from '@elastic/eui';
import * as Rx from 'rxjs';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { AdvancedSettingsForm } from './advanced_settings_form';
import { BlacklistForm } from './blacklist_form';
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
    id: 'blacklist',
    title: i18n.translate('xpack.graph.settings.blacklistTitle', { defaultMessage: 'Block list' }),
    component: BlacklistForm,
  },
  {
    id: 'drillDowns',
    title: i18n.translate('xpack.graph.settings.drillDownsTitle', {
      defaultMessage: 'Drilldowns',
    }),
    component: UrlTemplateList,
  },
];

/**
 * These props are wired in the angular scope and are passed in via observable
 * to catch update outside updates
 */
export interface AngularProps {
  blacklistedNodes: WorkspaceNode[];
  unblacklistNode: (node: WorkspaceNode) => void;
  canEditDrillDownUrls: boolean;
}

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

interface AsObservable<P> {
  observable: Readonly<Rx.Observable<P>>;
}

export interface SettingsProps extends AngularProps, StateProps, DispatchProps {}

export function SettingsComponent({
  observable,
  ...props
}: AsObservable<AngularProps> & StateProps & DispatchProps) {
  const [angularProps, setAngularProps] = useState<AngularProps | undefined>(undefined);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    observable.subscribe(setAngularProps);
  }, [observable]);

  if (!angularProps) return null;

  const ActiveTabContent = tabs[activeTab].component;
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{i18n.translate('xpack.graph.settings.title', { defaultMessage: 'Settings' })}</h2>
        </EuiTitle>
        <EuiTabs style={{ margin: '0 -16px -25px' }}>
          {tabs
            .filter(({ id }) => id !== 'drillDowns' || angularProps.canEditDrillDownUrls)
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
        <ActiveTabContent {...angularProps} {...props} />
      </EuiFlyoutBody>
    </>
  );
}

export const Settings = connect<StateProps, DispatchProps, AsObservable<AngularProps>, GraphState>(
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
