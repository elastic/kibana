/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiCallOut, EuiText } from '@elastic/eui';

interface Props {
  inferenceType: string;
  info: string[];
}

export const getInferenceInfoComponent = (inferenceType: string, info: string[]) => (
  <InferenceInfo inferenceType={inferenceType} info={info} />
);

export const InferenceInfo: FC<Props> = ({ inferenceType, info }) => {
  if (info.length === 0) {
    return null;
  }
  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.ml.editModelSnapshotFlyout.calloutTitle', {
          defaultMessage: 'Model type: {inferenceType}',
          values: { inferenceType },
        })}
      >
        {info.map((i) => (
          <EuiText size="s">{i}</EuiText>
        ))}
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
