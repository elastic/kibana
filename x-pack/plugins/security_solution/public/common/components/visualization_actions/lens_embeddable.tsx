/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import styled from 'styled-components';
import { setAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { useKibana } from '../../lib/kibana';
import { useLensAttributes } from './use_lens_attributes';
import { LensEmbeddableComponentProps } from './types';
import { useActions } from './use_actions';

const LensComponentWrapper = styled.div<{ height?: string }>`
  height: ${({ height }) => height ?? 'auto'};
`;

const LensEmbeddableComponent = ({
  getLensAttributes,
  height,
  id,
  inputsModelId = 'global',
  lensAttributes,
  stackByField,
  timerange,
}: LensEmbeddableComponentProps) => {
  const { lens } = useKibana().services;
  const dispatch = useDispatch();
  const { attributes, indexPattern } = useLensAttributes({
    lensAttributes,
    getLensAttributes,
    stackByField,
    title: '',
  });
  const LensComponent = lens.EmbeddableComponent;

  const actions = useActions({
    withActions: true,
    attributes,
    timeRange: timerange,
  });

  const inspectExtraInfo = useMemo(
    () => ({
      indexFilters: {
        description: 'Active index patterns',
        label: 'Index Pattern',
        value: indexPattern.join(', '),
      },
    }),
    [indexPattern]
  );

  return attributes ? (
    <LensComponentWrapper height={height}>
      <LensComponent
        id={id}
        style={{ height: '100%' }}
        timeRange={timerange}
        attributes={attributes}
        // onLoad={(val) => {
        //   setIsLoading(val);
        // }}
        onBrushEnd={({ range }: { range: number[] }) => {
          dispatch(
            setAbsoluteRangeDatePicker({
              id: inputsModelId,
              from: new Date(range[0]).toISOString(),
              to: new Date(range[1]).toISOString(),
            })
          );
        }}
        viewMode={ViewMode.VIEW}
        onFilter={
          (/* _data*/) => {
            // call back event for on filter event
          }
        }
        onTableRowClick={
          (/* _data*/) => {
            // call back event for on table row click event
          }
        }
        withDefaultActions={true}
        extraActions={actions}
      />
    </LensComponentWrapper>
  ) : null;
};

export const LensEmbeddable = React.memo(LensEmbeddableComponent);
