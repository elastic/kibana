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
  taskLabel: string;
  info: string[];
}

export const getInferenceInfoComponent = (taskLabel: string, info: string[]) => (
  <InferenceInfo taskLabel={taskLabel} info={info} />
);

const InferenceInfo: FC<Props> = ({ taskLabel, info }) => {
  if (info.length === 0) {
    return null;
  }
  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.ml.editModelSnapshotFlyout.calloutTitle', {
          defaultMessage: 'Task: {taskLabel}',
          values: { taskLabel },
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
