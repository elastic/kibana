/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { useLoadSettings } from '../../../../lib/api';
import { WatchActionsDropdown } from './threshold_watch_action_dropdown';
import { WatchActionsAccordion } from './threshold_watch_action_accordion';
import { WatchContext } from '../../watch_context';

interface Props {
  actionErrors: {
    [key: string]: {
      [key: string]: string[];
    };
  };
}

export const WatchActionsPanel: React.FunctionComponent<Props> = ({ actionErrors }) => {
  const { watch } = useContext(WatchContext);

  const { data: settings, isLoading } = useLoadSettings();

  return (
    <div data-test-subj="watchActionsPanel">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.watcher.sections.watchEdit.actions.title', {
                defaultMessage:
                  'Perform {watchActionsCount, plural, one{# action} other {# actions}} when condition is met',
                values: {
                  watchActionsCount: watch.actions.length,
                },
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem className="watcherThresholdWatchActionDropdownContainer">
          <WatchActionsDropdown settings={settings} isLoading={isLoading} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <WatchActionsAccordion settings={settings} actionErrors={actionErrors} />
    </div>
  );
};
