/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { PingHistogramComponent } from '../../common/charts';
import { selectPingHistogram } from '../../../state/selectors';
import { ResponsiveWrapperProps, withResponsiveWrapper } from '../../common/higher_order';

interface Props {
  height: string;
}

const Container: React.FC<Props & ResponsiveWrapperProps> = ({ height }) => {
  const { pingHistogram: data, loading } = useSelector(selectPingHistogram);

  return <PingHistogramComponent data={data} height={height} loading={loading} />;
};

export const PingHistogram = withResponsiveWrapper(Container);
