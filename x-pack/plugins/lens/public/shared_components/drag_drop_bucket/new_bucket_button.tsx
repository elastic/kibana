/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';

interface NewBucketButtonProps {
  label: string;
  onClick: () => void;
  isDisabled?: boolean;
  className?: string;
  'data-test-subj'?: string;
}

export const NewBucketButton = ({
  label,
  onClick,
  isDisabled,
  className,
  'data-test-subj': dataTestSubj = 'lns-newBucket-add',
}: NewBucketButtonProps) => (
  <EuiButtonEmpty
    data-test-subj={dataTestSubj}
    size="xs"
    iconType="plusInCircle"
    onClick={onClick}
    isDisabled={isDisabled}
    flush="left"
    className={className}
  >
    {label}
  </EuiButtonEmpty>
);
