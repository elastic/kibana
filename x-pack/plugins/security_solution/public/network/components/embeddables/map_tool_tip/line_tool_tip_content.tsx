/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { ITooltipProperty } from '@kbn/maps-plugin/public/classes/tooltips/tooltip_property';
import { SourceDestinationArrows } from '../../source_destination/source_destination_arrows';
import {
  SUM_OF_CLIENT_BYTES,
  SUM_OF_DESTINATION_BYTES,
  SUM_OF_SERVER_BYTES,
  SUM_OF_SOURCE_BYTES,
} from '../map_config';

import * as i18n from '../translations';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths

const FlowBadge = styled(EuiBadge)`
  height: 45px;
  min-width: 85px;
` as unknown as typeof EuiBadge;

const EuiFlexGroupStyled = styled(EuiFlexGroup)`
  margin: 0 auto;
`;

interface LineToolTipContentProps {
  contextId: string;
  featureProps: ITooltipProperty[];
}

export const LineToolTipContentComponent = ({
  contextId,
  featureProps,
}: LineToolTipContentProps) => {
  const lineProps = featureProps.reduce<Record<string, string[]>>((acc, f) => {
    const rawValue = f.getRawValue() ?? [];
    return {
      ...acc,
      ...{
        [f.getPropertyKey()]: Array.isArray(rawValue) ? rawValue : [rawValue],
      },
    };
  }, {});

  const isSrcDest = Object.keys(lineProps).includes(SUM_OF_SOURCE_BYTES);

  return (
    <EuiFlexGroup justifyContent="center" gutterSize="none">
      <EuiFlexItem>
        <FlowBadge color="hollow">
          <EuiFlexGroupStyled direction="column">
            <EuiFlexItem grow={false}>{isSrcDest ? i18n.SOURCE : i18n.CLIENT}</EuiFlexItem>
          </EuiFlexGroupStyled>
        </FlowBadge>
      </EuiFlexItem>
      <SourceDestinationArrows
        contextId={contextId}
        destinationBytes={
          isSrcDest ? lineProps[SUM_OF_DESTINATION_BYTES] : lineProps[SUM_OF_SERVER_BYTES]
        }
        eventId={`map-line-tooltip-${contextId}`}
        sourceBytes={isSrcDest ? lineProps[SUM_OF_SOURCE_BYTES] : lineProps[SUM_OF_CLIENT_BYTES]}
      />
      <EuiFlexItem>
        <FlowBadge color="hollow">
          <EuiFlexGroupStyled>
            <EuiFlexItem grow={false}>{isSrcDest ? i18n.DESTINATION : i18n.SERVER}</EuiFlexItem>
          </EuiFlexGroupStyled>
        </FlowBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

LineToolTipContentComponent.displayName = 'LineToolTipContentComponent';

export const LineToolTipContent = React.memo(LineToolTipContentComponent);

LineToolTipContent.displayName = 'LineToolTipContent';
