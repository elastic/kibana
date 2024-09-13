/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldNumber, EuiFormRow, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Validation } from '../../../../../../../common/types';
import {
  BandwidthLimitKey,
  ConfigKey,
  DEFAULT_BANDWIDTH_LIMIT,
  ThrottlingConfig,
  ThrottlingConfigValue,
} from '../../../../../../../common/runtime_types';
import { ThrottlingExceededMessage } from './throttling_exceeded_callout';
import { OptionalLabel } from '../optional_label';

export const ThrottlingDownloadField = ({
  handleInputChange,
  readOnly,
  onFieldBlur,
  validate,
  throttling,
  throttlingValue,
}: {
  readOnly?: boolean;
  handleInputChange: (value: string) => void;
  onFieldBlur?: (field: keyof ThrottlingConfigValue) => void;
  validate?: Validation;
  throttling: ThrottlingConfig;
  throttlingValue: ThrottlingConfigValue;
}) => {
  const maxDownload = Number(DEFAULT_BANDWIDTH_LIMIT[BandwidthLimitKey.DOWNLOAD]);

  const exceedsDownloadLimits = Number(throttlingValue.download) > maxDownload;

  return (
    <EuiFormRow
      fullWidth
      label={DOWNLOAD_LABEL}
      labelAppend={<OptionalLabel />}
      isInvalid={
        (validate ? !!validate?.[ConfigKey.THROTTLING_CONFIG]?.(throttling) : false) ||
        exceedsDownloadLimits
      }
      error={
        exceedsDownloadLimits ? (
          <ThrottlingExceededMessage throttlingField="download" limit={maxDownload} />
        ) : (
          DOWNLOAD_SPEED_ERROR
        )
      }
    >
      <EuiFieldNumber
        fullWidth
        min={0}
        step={0.001}
        value={throttlingValue.download}
        onChange={(event) => {
          handleInputChange(event.target.value);
        }}
        onBlur={() => onFieldBlur?.('download')}
        data-test-subj="syntheticsBrowserDownloadSpeed"
        append={
          <EuiText size="xs">
            <strong>Mbps</strong>
          </EuiText>
        }
        readOnly={readOnly}
      />
    </EuiFormRow>
  );
};

export const DOWNLOAD_LABEL = i18n.translate(
  'xpack.synthetics.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.download.label',
  {
    defaultMessage: 'Download Speed',
  }
);

export const DOWNLOAD_SPEED_ERROR = i18n.translate(
  'xpack.synthetics.createPackagePolicy.stepConfigure.browserAdvancedSettings.throttling.download.error',
  {
    defaultMessage: 'Download speed must be greater than zero.',
  }
);
