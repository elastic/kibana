/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { useLoadSettings } from '../../../../lib/api';
import { WatchContext } from '../../watch_context';
import { WatchActionsAccordion } from './threshold_watch_action_accordion';
import { WatchActionsDropdown } from './threshold_watch_action_dropdown';

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
