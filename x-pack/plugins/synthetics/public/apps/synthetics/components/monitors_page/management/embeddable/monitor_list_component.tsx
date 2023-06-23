/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { withEmbeddableSubscription } from '@kbn/embeddable-plugin/public';
import { useLocation } from 'react-router-dom';
import { useGetUrlParams } from '../../../../hooks';
import { MonitorListContainer } from '../monitor_list_container';
import {
  MonitorListEmbeddable,
  MonitorListInput,
  MonitorListOutput,
} from './monitor_list_embeddable';
import { SyntheticsEmbeddableContext } from '../../../../../embeddables/synthetics_embeddable_context';

export const MonitorListComponentInner = ({
  embeddable,
  input,
}: {
  embeddable: MonitorListEmbeddable;
  input: MonitorListInput;
}) => {
  const { search } = useLocation();

  const params = useGetUrlParams();

  useEffect(() => {
    if (input.search !== search) {
      embeddable.updateInput({ search });
    }
  }, [embeddable, search, params, input.search]);

  return <MonitorListContainer isEnabled={true} />;
};

export const MonitorListComponentState = ({
  input,
  embeddable,
}: {
  embeddable: MonitorListEmbeddable;
  input: MonitorListInput;
  output: MonitorListOutput;
}) => {
  return (
    <SyntheticsEmbeddableContext search={input.search}>
      <MonitorListComponentInner embeddable={embeddable} input={input} />
    </SyntheticsEmbeddableContext>
  );
};

export const MonitorListEmbeddableComponent = withEmbeddableSubscription<
  MonitorListInput,
  MonitorListOutput,
  MonitorListEmbeddable
>(MonitorListComponentState);
