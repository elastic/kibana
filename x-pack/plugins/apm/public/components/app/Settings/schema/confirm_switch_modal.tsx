/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiConfirmModal,
  EuiCallOut,
  EuiCheckbox,
  EuiSpacer,
  EuiCodeBlock,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ElasticDocsLink } from '../../../shared/Links/ElasticDocsLink';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
  unsupportedConfigs: Array<{ key: string; value: string }>;
  isLoading: boolean;
}
export function ConfirmSwitchModal({
  onConfirm,
  onCancel,
  unsupportedConfigs,
  isLoading,
}: Props) {
  const [isConfirmChecked, setIsConfirmChecked] = useState(false);
  const hasIncompatibleSettings = unsupportedConfigs.length > 0;
  return (
    <EuiConfirmModal
      title="Please confirm your choice"
      cancelButtonText="Cancel"
      onCancel={onCancel}
      confirmButtonText="Switch to data streams"
      defaultFocusedButton="confirm"
      onConfirm={onConfirm}
      confirmButtonDisabled={!isConfirmChecked}
      isLoading={isLoading}
    >
      <p>
        If you have custom dashboards, machine learning jobs, or source maps
        that use classic APM indices, you must reconfigure them for data
        streams.
      </p>
      {!hasIncompatibleSettings && (
        <p>
          Compatible custom apm-server.yml user settings will be moved to Fleet
          Server settings for you. We'll let you know which settings are
          incompatible before removing them.
        </p>
      )}
      <EuiCallOut
        title="Switching to data streams is an irreversible action"
        color="warning"
        iconType="help"
      >
        <p>
          It might temporarily affect your APM data collection while the
          migration is in progress. The process of migrating should only take a
          few minutes.
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
      {hasIncompatibleSettings && (
        <>
          <EuiCallOut
            title="The following apm-server.yml user settings are incompatible and will be removed"
            iconType="iInCircle"
          >
            <EuiCodeBlock language="yaml">
              {unsupportedConfigs
                .map(({ key, value }) => `${key}: ${JSON.stringify(value)}`)
                .join('\n')}
            </EuiCodeBlock>
            <p>
              <ElasticDocsLink
                section="/cloud"
                path="/ec-manage-apm-settings.html"
                target="_blank"
              >
                {i18n.translate(
                  'xpack.apm.settings.schema.confirm.apmServerSettingsCloudLinkText',
                  { defaultMessage: 'Go to APM Server settings in Cloud' }
                )}
              </ElasticDocsLink>
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      <p>
        <EuiCheckbox
          id={htmlIdGenerator()()}
          label="I confirm that I wish to switch to data streams"
          checked={isConfirmChecked}
          onChange={(e) => {
            setIsConfirmChecked(e.target.checked);
          }}
          disabled={isLoading}
        />
      </p>
    </EuiConfirmModal>
  );
}
