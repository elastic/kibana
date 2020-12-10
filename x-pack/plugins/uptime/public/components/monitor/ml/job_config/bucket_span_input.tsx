/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldText } from '@elastic/eui';

interface Props {
  bucketSpan: string;
  setBucketSpan: (bs: string) => void;
  isInvalid: boolean;
  disabled: boolean;
  loading: boolean;
}

export const BucketSpanInput: FC<Props> = ({
  loading,
  bucketSpan,
  setBucketSpan,
  isInvalid,
  disabled,
}) => {
  return (
    <EuiFieldText
      isLoading={loading}
      disabled={disabled}
      placeholder={i18n.translate('xpack.uptime.ml.newJob.config.bucketSpan.placeholder', {
        defaultMessage: 'Bucket span',
      })}
      value={bucketSpan}
      onChange={(e) => setBucketSpan(e.target.value)}
      isInvalid={isInvalid}
      data-test-subj="uptimeMLBucketSpanInput"
    />
  );
};
