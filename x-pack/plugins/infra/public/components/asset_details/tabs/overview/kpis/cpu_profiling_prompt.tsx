/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { usePluginConfig } from '../../../../../containers/plugin_config_context';
import { useTabSwitcherContext } from '../../../hooks/use_tab_switcher';

export function CpuProfilingPrompt() {
  const { showTab } = useTabSwitcherContext();
  const { featureFlags } = usePluginConfig();

  if (!featureFlags.profilingEnabled) {
    return null;
  }

  return (
    <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
      <EuiBadge color="success">
        {i18n.translate('xpack.infra.cpuProfilingPrompt.newBadgeLabel', {
          defaultMessage: 'NEW',
        })}
      </EuiBadge>
      <EuiFlexGroup alignItems="baseline" justifyContent="flexStart" gutterSize="xs">
        {i18n.translate('xpack.infra.cpuProfilingPrompt.p.viewCPUBreakdownUsingLabel', {
          defaultMessage: 'View CPU Breakdown using',
        })}
        <EuiButtonEmpty
          data-test-subj="infraCpuProfilingPromptProfilingButton"
          onClick={() => showTab('profiling')}
          flush="both"
        >
          {i18n.translate('xpack.infra.cpuProfilingPrompt.profilingButtonEmptyLabel', {
            defaultMessage: 'Profiling',
          })}
        </EuiButtonEmpty>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
