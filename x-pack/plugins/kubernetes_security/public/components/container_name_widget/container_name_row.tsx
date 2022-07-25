/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useState } from 'react';
import { EuiFlexItem, EuiText } from '@elastic/eui';
import { useStyles } from './styles';

export interface ContainerNameRowDeps {
  name: string;
  filterButtonIn?: ReactNode;
  filterButtonOut?: ReactNode;
}

export const ROW_TEST_ID = 'kubernetesSecurity:containerNameSessionRow';

export const ContainerNameRow = ({
  name,
  filterButtonIn,
  filterButtonOut,
}: ContainerNameRowDeps) => {
  const [isHover, setIsHover] = useState<boolean>(false);

  const styles = useStyles();

  return (
    <EuiFlexItem
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      data-test-subj={ROW_TEST_ID}
    >
      <EuiText size="xs" css={styles.dataInfo}>
        {name}
        {isHover && (
          <div css={styles.filters}>
            {filterButtonIn}
            {filterButtonOut}
          </div>
        )}
      </EuiText>
    </EuiFlexItem>
  );
};
