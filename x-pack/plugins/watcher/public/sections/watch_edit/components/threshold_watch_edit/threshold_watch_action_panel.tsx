/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { fetchSettings } from '../../../../lib/api';
import { WatchActionsDropdown } from './threshold_watch_action_dropdown';
import { WatchActionsAccordion } from './threshold_watch_action_accordion';
import { WatchContext } from '../../watch_context';

export const WatchActionsPanel = () => {
  const { watch } = useContext(WatchContext);

  const [settings, setSettings] = useState<{
    actionTypes: {
      [key: string]: {
        enabled: boolean;
      };
    };
  } | null>(null);

  const getSettings = async () => {
    const actionSettings = await fetchSettings();
    setSettings(actionSettings);
  };

  useEffect(() => {
    getSettings();
  }, []);

  return (
    <Fragment>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.watcher.sections.watchEdit.actions.title', {
                defaultMessage:
                  'Will perform {watchActionsCount, plural, one{# action} other {# actions}} once met',
                values: {
                  watchActionsCount: watch.actions.length,
                },
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem className="watcherThresholdWatchActionDropdownContainer">
          <WatchActionsDropdown settings={settings} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <WatchActionsAccordion settings={settings} />
    </Fragment>
  );
};
