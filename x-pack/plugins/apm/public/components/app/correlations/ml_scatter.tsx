/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useParams } from 'react-router-dom';

import { Scatter } from '../../../../../ml/public';

import { useUrlParams } from '../../../context/url_params_context/use_url_params';

interface Props {
  onClose: () => void;
}

export function MlScatter({ onClose }: Props) {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams } = useUrlParams();
  return (
    <Scatter
      {...{
        serviceName,
        ...urlParams,
      }}
    />
  );
}
