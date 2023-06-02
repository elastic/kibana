/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React, { FC } from 'react';
import { useMlLink } from '../contexts/kibana';
import { ML_PAGES } from '../../../common/constants/locator';

export interface TrainedModelLinkProps {
  id: string;
}

export const TrainedModelLink: FC<TrainedModelLinkProps> = ({ id }) => {
  const href = useMlLink({
    page: ML_PAGES.TRAINED_MODELS_MANAGE,
    pageState: { modelId: id },
  });

  return (
    <EuiLink href={href} css={{ overflow: 'hidden', 'text-overflow': 'ellipsis' }} title={id}>
      {id}
    </EuiLink>
  );
};
