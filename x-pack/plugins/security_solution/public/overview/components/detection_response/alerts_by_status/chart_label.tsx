/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';
import { FormattedCount } from '../../../../common/components/formatted_number';

interface ChartLabelProps {
  count: number | null | undefined;
}

const PlaceHolder = styled.div`
  padding: ${(props) => props.theme.eui.paddingSizes.s};
`;

const ChartLabelComponent: React.FC<ChartLabelProps> = ({ count }) => {
  return count != null ? (
    <b>
      <FormattedCount count={count} />
    </b>
  ) : (
    <PlaceHolder />
  );
};

ChartLabelComponent.displayName = 'ChartLabelComponent';
export const ChartLabel = React.memo(ChartLabelComponent);
