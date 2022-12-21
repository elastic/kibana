/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { CSSInterpolation } from '@emotion/serialize';
import type { BenchmarkId } from '../../common/types';
import cisK8sVanillaIcon from '../assets/icons/k8s_logo.svg';
import cisEksIcon from '../assets/icons/cis_eks_logo.svg';

interface Props {
  type: BenchmarkId;
  name?: string;
  style?: CSSInterpolation;
}

const getBenchmarkIdIconType = (props: Props): string => {
  switch (props.type) {
    case 'cis_eks':
      return cisEksIcon;
    case 'cis_k8s':
    default:
      return cisK8sVanillaIcon;
  }
};

export const CISBenchmarkIcon = (props: Props) => (
  <EuiToolTip content={props.name}>
    <EuiIcon type={getBenchmarkIdIconType(props)} size="xl" css={props.style} />
  </EuiToolTip>
);
