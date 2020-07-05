/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCard, EuiIcon } from '@elastic/eui';
import { KidInfo } from '../../services';

export interface Props {
  info: KidInfo;
}

export const KidCard: React.FC<Props> = ({ info }) => {
  return (
    <EuiCard
      icon={info.euiIcon ? <EuiIcon size="xxl" type={info.euiIcon} /> : undefined}
      title={info.name || 'Untitled'}
      description={info.description || ''}
      onClick={() => {}}
    />
  );
};
