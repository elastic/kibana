/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FlyoutFooter } from '../../shared/components/flyout_footer';
import { HostPanelKey } from '../host_right';

export interface HostPreviewPanelFooterProps {
  contextID: string;
  scopeId: string;
  hostName: string;
  isDraggable?: boolean;
}

export const HostPreviewPanelFooter = ({
  contextID,
  scopeId,
  hostName,
  isDraggable,
}: HostPreviewPanelFooterProps) => {
  const { openFlyout } = useExpandableFlyoutApi();

  const openHostFlyout = useCallback(() => {
    openFlyout({
      right: {
        id: HostPanelKey,
        params: {
          contextID,
          hostName,
          scopeId,
          isDraggable,
        },
      },
    });
  }, [openFlyout, hostName, contextID, isDraggable, scopeId]);

  return (
    <FlyoutFooter data-test-subj={'host-preview-footer'}>
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLink onClick={openHostFlyout} target="_blank" data-test-subj={'open-host-flyout'}>
            {i18n.translate('xpack.securitySolution.flyout.host.preview.viewDetailsLabel', {
              defaultMessage: 'Open host details flyout',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlyoutFooter>
  );
};
