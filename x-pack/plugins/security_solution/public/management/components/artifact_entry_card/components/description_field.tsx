/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren } from 'react';
import { CommonProps } from '@elastic/eui';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { TextValueDisplay, TextValueDisplayProps } from './text_value_display';

export type DescriptionFieldProps = PropsWithChildren<{}> &
  Pick<CommonProps, 'data-test-subj'> &
  Pick<TextValueDisplayProps, 'truncate' | 'withTooltip'>;

export const DescriptionField = memo<DescriptionFieldProps>(
  ({ truncate, children, 'data-test-subj': dataTestSubj, withTooltip }) => {
    return (
      <TextValueDisplay
        size="m"
        truncate={truncate}
        data-test-subj={dataTestSubj}
        withTooltip={withTooltip}
      >
        {children || getEmptyValue()}
      </TextValueDisplay>
    );
  }
);
DescriptionField.displayName = 'ArtifactDescription';
