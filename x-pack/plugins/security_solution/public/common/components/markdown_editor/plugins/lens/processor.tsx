/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import React from 'react';
import { EuiText, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import { Moment } from 'moment';

import { EmbeddableComponentProps } from '../../../../../../../lens/public';
import { useKibana } from '../../../../lib/kibana';
import { LENS_VISUALIZATION_HEIGHT } from './constants';

const Container = styled.div`
  min-height: ${LENS_VISUALIZATION_HEIGHT}px;
`;

interface LensMarkDownRendererProps {
  id?: string | null;
  title?: string | null;
  startDate?: Moment | null;
  endDate?: Moment | null;
  onBrushEnd?: EmbeddableComponentProps['onBrushEnd'];
}

const LensMarkDownRendererComponent: React.FC<LensMarkDownRendererProps> = ({
  id,
  title,
  startDate,
  endDate,
  onBrushEnd,
}) => {
  const kibana = useKibana();
  const LensComponent = kibana?.services?.lens?.EmbeddableComponent!;

  return (
    <Container>
      {id ? (
        <>
          <EuiText>
            <h5>{title}</h5>
          </EuiText>
          <EuiSpacer size="xs" />
          <LensComponent
            id={`${id}-${uuid.v4()}`}
            style={{ height: LENS_VISUALIZATION_HEIGHT }}
            timeRange={{
              from: startDate ?? 'now-5d',
              to: endDate ?? 'now',
              mode: startDate ? 'absolute' : 'relative',
            }}
            savedObjectId={id}
            onBrushEnd={onBrushEnd}
          />
        </>
      ) : null}
    </Container>
  );
};

export const LensMarkDownRenderer = React.memo(LensMarkDownRendererComponent);
