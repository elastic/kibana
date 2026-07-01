/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Panel } from '@xyflow/react';
import { EuiButtonEmpty, EuiPanel, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { enableDiagnosticMode } from '@kbn/observability-plugin/common';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { DiagnosticFlyout } from './diagnostic_tool/diagnostic_flyout';
import type { ServiceMapSelection } from './popover/popover_content';

interface ServiceMapDiagnosticButtonProps {
  selection?: ServiceMapSelection;
}

export function ServiceMapDiagnosticButton({ selection }: ServiceMapDiagnosticButtonProps) {
  const { core } = useApmPluginContext();
  const isDiagnosticModeEnabled = core?.uiSettings?.get(enableDiagnosticMode);
  const [isOpen, setIsOpen] = useState(false);

  if (!isDiagnosticModeEnabled) return null;

  return (
    <>
      <Panel position="bottom-left">
        <EuiPanel hasBorder hasShadow={false} paddingSize="none" borderRadius="m" grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.apm.serviceMap.diagnosticButton.tooltip', {
              defaultMessage: 'Open diagnostic tool',
            })}
          >
            <EuiButtonEmpty
              size="s"
              iconType="unlink"
              onClick={() => setIsOpen(true)}
              data-test-subj="serviceMapOpenDiagnosticButton"
              data-ebt-action="openDiagnosticTool"
              data-ebt-element="serviceMapDiagnosticBar"
            >
              {i18n.translate('xpack.apm.serviceMap.diagnosticButton.label', {
                defaultMessage: 'Missing connections?',
              })}
            </EuiButtonEmpty>
          </EuiToolTip>
        </EuiPanel>
      </Panel>
      {isOpen && (
        <DiagnosticFlyout isOpen={true} onClose={() => setIsOpen(false)} selection={selection} />
      )}
    </>
  );
}
