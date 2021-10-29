/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { CommonProps } from '@elastic/eui';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { TextValueDisplay } from './text_value_display';

export type DescriptionFieldProps = Pick<CommonProps, 'data-test-subj'>;

export const DescriptionField = memo<DescriptionFieldProps>(
  ({ children, 'data-test-subj': dataTestSubj }) => {
    return (
      <TextValueDisplay size="m">
        <p data-test-subj={dataTestSubj} className="eui-textBreakWord">
          {children || getEmptyValue()}
        </p>
      </TextValueDisplay>
    );
  }
);
DescriptionField.displayName = 'ArtifactDescription';
