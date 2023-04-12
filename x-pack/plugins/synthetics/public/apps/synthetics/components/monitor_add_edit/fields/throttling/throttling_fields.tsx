/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ThrottlingUploadField } from './throttling_upload_field';
import { ThrottlingExceededCallout } from './throttling_exceeded_callout';
import {
  BandwidthLimitKey,
  DEFAULT_BANDWIDTH_LIMIT,
  ThrottlingConfig,
} from '../../../../../../../common/runtime_types';
import { Validation } from '../../types';
import { ThrottlingDisabledCallout } from './throttling_disabled_callout';
import { ThrottlingDownloadField } from './throttling_download_field';
import { ThrottlingLatencyField } from './throttling_latency_field';
import { CONNECTION_PROFILE_VALUES } from '../../constants';

interface Props {
  validate?: Validation;
  minColumnWidth?: string;
  onFieldBlur?: (field: keyof ThrottlingConfig) => void;
  readOnly?: boolean;
  throttling: ThrottlingConfig;
  setValue: (value: ThrottlingConfig) => void;
}

export const ThrottlingFields = memo<Props>(
  ({ validate, minColumnWidth, onFieldBlur, setValue, readOnly = false, throttling }) => {
    const maxDownload = DEFAULT_BANDWIDTH_LIMIT[BandwidthLimitKey.DOWNLOAD];
    const maxUpload = DEFAULT_BANDWIDTH_LIMIT[BandwidthLimitKey.UPLOAD];

    const handleInputChange = useCallback(
      ({ value, configKey }: { value: unknown; configKey: string }) => {
        setValue({ ...throttling, [configKey]: Number(value) });
      },
      [setValue, throttling]
    );

    // handle this in the parent component
    // const runsOnService = true;

    const exceedsDownloadLimits = throttling.download > maxDownload;
    const exceedsUploadLimits = throttling.upload > maxUpload;
    const isThrottlingEnabled = throttling.label !== CONNECTION_PROFILE_VALUES.NO_THROTTLING;

    const hasExceededLimits = isThrottlingEnabled && (exceedsDownloadLimits || exceedsUploadLimits);

    if (!isThrottlingEnabled) {
      return <ThrottlingDisabledCallout />;
    }

    return (
      <div>
        {hasExceededLimits && <ThrottlingExceededCallout />}
        <EuiSpacer size="m" />
        <EuiFormRow label={CUSTOM_PROFILE_LABEL} helpText={CUSTOM_PROFILE_HELP} fullWidth>
          <EuiFieldText
            fullWidth
            data-test-subj="syntheticsThrottlingFieldsFieldText"
            value={throttling.label}
            onChange={(event) => {
              setValue({ ...throttling, label: event.target.value });
            }}
          />
        </EuiFormRow>
        <ThrottlingDownloadField
          validate={validate}
          onFieldBlur={onFieldBlur}
          throttling={throttling}
          handleInputChange={(val) => {
            handleInputChange({ value: val, configKey: 'download' });
          }}
        />
        <ThrottlingUploadField
          validate={validate}
          onFieldBlur={onFieldBlur}
          throttling={throttling}
          handleInputChange={(val) => {
            handleInputChange({ value: val, configKey: 'upload' });
          }}
        />
        <ThrottlingLatencyField
          validate={validate}
          onFieldBlur={onFieldBlur}
          throttling={throttling}
          handleInputChange={(val) => {
            handleInputChange({ value: val, configKey: 'latency' });
          }}
        />
      </div>
    );
  }
);

export const CUSTOM_PROFILE_LABEL = i18n.translate(
  'xpack.synthetics.monitorAddEdit.customProfileLabel',
  {
    defaultMessage: 'Custom Profile name',
  }
);

export const CUSTOM_PROFILE_HELP = i18n.translate(
  'xpack.synthetics.monitorAddEdit.customProfileLabel.helpText',
  {
    defaultMessage: 'Choose a name to help identify this profile in the future.',
  }
);
