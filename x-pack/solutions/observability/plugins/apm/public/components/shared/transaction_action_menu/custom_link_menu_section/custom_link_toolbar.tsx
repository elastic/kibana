/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiButtonEmpty,
  EuiIcon,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { NO_PERMISSION_LABEL } from '../../../../../common/custom_link';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export function CustomLinkToolbar({
  onClickCreate,
  showCreateButton = true,
}: {
  onClickCreate: () => void;
  showCreateButton?: boolean;
}) {
  const { core } = useApmPluginContext();
  const canSave = !!core.application.capabilities.apm.save;
  const { link } = useApmRouter();

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
          <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
            <EuiToolTip
              position="top"
              content={i18n.translate('xpack.apm.customLink.buttom.manage', {
                defaultMessage: 'Manage custom links',
              })}
            >
              <EuiLink
                data-test-subj="apmCustomLinksSettingsPage"
                href={link('/settings/custom-links')}
              >
                <EuiIcon
                  type="gear"
                  color="text"
                  aria-label={i18n.translate(
                    'xpack.apm.customLinkToolbar.euiIcon.customLinksSettingsPageLabel',
                    { defaultMessage: 'Custom links settings page' }
                  )}
                />
              </EuiLink>
            </EuiToolTip>
          </EuiFlexItem>
          {showCreateButton && (
            <EuiToolTip content={!canSave && NO_PERMISSION_LABEL}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  aria-label={i18n.translate('xpack.apm.customLinkToolbar.createButton.ariaLabel', {
                    defaultMessage: 'Create',
                  })}
                  data-test-subj="apmCustomLinkToolbarCreateButton"
                  isDisabled={!canSave}
                  iconType="plusInCircle"
                  size="xs"
                  onClick={onClickCreate}
                >
                  {i18n.translate('xpack.apm.customLink.buttom.create.title', {
                    defaultMessage: 'Create',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiToolTip>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
