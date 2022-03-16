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
import { useUiTracker } from '../../../../../../observability/public';
import { ElasticDocsLink } from '../../../shared/links/elastic_docs_link';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
  unsupportedConfigs: Array<{ key: string; value: string }>;
}
export function ConfirmSwitchModal({
  onConfirm,
  onCancel,
  unsupportedConfigs,
}: Props) {
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const [isConfirmChecked, setIsConfirmChecked] = useState(false);
  const hasUnsupportedConfigs = !!unsupportedConfigs.length;
  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.apm.settings.schema.confirm.title', {
        defaultMessage: 'Please confirm your choice',
      })}
      cancelButtonText={i18n.translate(
        'xpack.apm.settings.schema.confirm.cancelText',
        {
          defaultMessage: 'Cancel',
        }
      )}
      onCancel={onCancel}
      confirmButtonText={i18n.translate(
        'xpack.apm.settings.schema.confirm.switchButtonText',
        {
          defaultMessage: 'Switch to Elastic Agent',
        }
      )}
      defaultFocusedButton="confirm"
      onConfirm={() => {
        trackApmEvent({
          metric: 'confirm_data_stream_switch',
        });
        onConfirm();
      }}
      confirmButtonDisabled={!isConfirmChecked}
    >
      {!hasUnsupportedConfigs && (
        <p>
          {i18n.translate(
            'xpack.apm.settings.schema.confirm.unsupportedConfigs.descriptionText',
            {
              defaultMessage: `Compatible custom apm-server.yml user settings will be moved to Fleet Server settings for you. We'll let you know which settings are incompatible before removing them.`,
            }
          )}
        </p>
      )}
      <EuiCallOut
        title={i18n.translate(
          'xpack.apm.settings.schema.confirm.irreversibleWarning.title',
          {
            defaultMessage: `Switching to Elastic Agent is an irreversible action`,
          }
        )}
        color="warning"
        iconType="help"
      >
        <p>
          {i18n.translate(
            'xpack.apm.settings.schema.confirm.irreversibleWarning.message',
            {
              defaultMessage: `It might temporarily affect your APM data collection while the migration is in progress. The process of migrating should only take a few minutes.`,
            }
          )}
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
      {hasUnsupportedConfigs && (
        <>
          <EuiCallOut
            title={i18n.translate(
              'xpack.apm.settings.schema.confirm.unsupportedConfigs.title',
              {
                defaultMessage: `The following apm-server.yml user settings are incompatible and will be removed`,
              }
            )}
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
          label={i18n.translate(
            'xpack.apm.settings.schema.confirm.checkboxLabel',
            {
              defaultMessage: `I confirm that I wish to switch to Elastic Agent`,
            }
          )}
          checked={isConfirmChecked}
          onChange={(e) => {
            setIsConfirmChecked(e.target.checked);
          }}
        />
      </p>
    </EuiConfirmModal>
  );
}
