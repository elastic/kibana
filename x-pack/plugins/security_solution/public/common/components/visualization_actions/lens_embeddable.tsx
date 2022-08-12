/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import styled from 'styled-components';
import { setAbsoluteRangeDatePicker } from '../../store/inputs/actions';
import { useKibana } from '../../lib/kibana';
import { useLensAttributes } from './use_lens_attributes';
import type { LensEmbeddableComponentProps } from './types';
import { useActions } from './use_actions';
import { inputsSelectors } from '../../store';
import { useDeepEqualSelector } from '../../hooks/use_selector';

const LensComponentWrapper = styled.div<{ height?: string }>`
  height: ${({ height }) => height ?? 'auto'};
  .expExpressionRenderer__expression {
    padding: 0 !important;
  }
`;

const LensEmbeddableComponent: React.FC<LensEmbeddableComponentProps> = ({
  getLensAttributes,
  height,
  id,
  inputsModelId = 'global',
  lensAttributes,
  stackByField,
  timerange,
}) => {
  const { lens } = useKibana().services;
  const dispatch = useDispatch();

  const getGlobalQuery = inputsSelectors.globalQueryByIdSelector();
  const { searchSessionId } = useDeepEqualSelector((state) => getGlobalQuery(state, id));
  const attributes = useLensAttributes({
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

  const onBrushEnd = useCallback(
    ({ range }: { range: number[] }) => {
      dispatch(
        setAbsoluteRangeDatePicker({
          id: inputsModelId,
          from: new Date(range[0]).toISOString(),
          to: new Date(range[1]).toISOString(),
        })
      );
    },
    [dispatch, inputsModelId]
  );
  return attributes && searchSessionId ? (
    <LensComponentWrapper height={height}>
      <LensComponent
        id={id}
        style={{ height: '100%' }}
        timeRange={timerange}
        attributes={attributes}
        // onLoad={(val) => {
        // }}
        onBrushEnd={onBrushEnd}
        viewMode={ViewMode.VIEW}
        // onFilter={
        //   (/* _data*/) => {
        //     // call back event for on filter event
        //   }
        // }
        // onTableRowClick={
        //   (/* _data*/) => {
        //     // call back event for on table row click event
        //   }
        // }
        withDefaultActions={false}
        extraActions={actions}
        searchSessionId={searchSessionId}
      />
    </LensComponentWrapper>
  ) : null;
};

export const LensEmbeddable = React.memo(LensEmbeddableComponent);
