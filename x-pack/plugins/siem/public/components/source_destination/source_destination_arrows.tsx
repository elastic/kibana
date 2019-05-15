/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import numeral from '@elastic/numeral';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { ArrowBody, ArrowHead } from '../arrows';
import {
  DEFAULT_ARROW_HEIGHT,
  getArrowHeightFromPercent,
  getPercent,
  hasOneValue,
} from '../arrows/helpers';
import { DefaultDraggable } from '../draggables';

import * as i18n from './translations';

export const SOURCE_BYTES_FIELD_NAME = 'source.bytes';
export const SOURCE_PACKETS_FIELD_NAME = 'source.packets';

export const DESTINATION_BYTES_FIELD_NAME = 'destination.bytes';
export const DESTINATION_PACKETS_FIELD_NAME = 'destination.packets';

const Percent = styled.span`
  margin-right: 5px;
`;

const SourceDestinationArrowsContainer = styled(EuiFlexGroup)`
  margin: 0 2px;
`;

const Data = styled(EuiText)`
  margin: 0 5px;
`;

/**
 * Visualizes the communication from a source as an arrow with draggable badges
 */
const SourceArrow = pure<{
  contextId: string;
  eventId: string;
  sourceBytes: string | undefined;
  sourceBytesPercent: number | undefined;
  sourcePackets: string | undefined;
}>(({ contextId, eventId, sourceBytes, sourceBytesPercent, sourcePackets }) => {
  const sourceArrowHeight =
    sourceBytesPercent != null
      ? getArrowHeightFromPercent(sourceBytesPercent)
      : DEFAULT_ARROW_HEIGHT;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="center">
      <EuiFlexItem grow={false}>
        <ArrowBody height={sourceArrowHeight} />
      </EuiFlexItem>

      {sourceBytes != null && !isNaN(Number(sourceBytes)) ? (
        <EuiFlexItem grow={false}>
          <DefaultDraggable
            field={SOURCE_BYTES_FIELD_NAME}
            id={`${contextId}-${eventId}-${SOURCE_BYTES_FIELD_NAME}-${sourceBytes}`}
            value={sourceBytes}
          >
            <Data size="xs">
              {sourceBytesPercent != null ? (
                <Percent data-test-subj="source-bytes-percent">
                  {`(${numeral(sourceBytesPercent).format('0.00')}%)`}
                </Percent>
              ) : null}
              <span data-test-subj="source-bytes">{numeral(sourceBytes).format('0.000 b')}</span>
            </Data>
          </DefaultDraggable>
        </EuiFlexItem>
      ) : null}

      <EuiFlexItem grow={false}>
        <ArrowBody data-test-subj="source-arrow" height={sourceArrowHeight} />
      </EuiFlexItem>

      {sourcePackets != null && !isNaN(Number(sourcePackets)) ? (
        <EuiFlexItem grow={false}>
          <DefaultDraggable
            field={SOURCE_PACKETS_FIELD_NAME}
            id={`${contextId}-${eventId}-${SOURCE_PACKETS_FIELD_NAME}-${sourcePackets}`}
            value={sourcePackets}
          >
            <Data size="xs">
              <span data-test-subj="source-packets">{`${sourcePackets} ${i18n.PACKETS}`}</span>
            </Data>
          </DefaultDraggable>
        </EuiFlexItem>
      ) : null}

      <EuiFlexItem grow={false}>
        <ArrowBody height={sourceArrowHeight} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <ArrowHead direction="arrowRight" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

/**
 * Visualizes the communication from a destination as an arrow with draggable
 * badges
 */
const DestinationArrow = pure<{
  contextId: string;
  eventId: string;
  destinationBytes: string | undefined;
  destinationBytesPercent: number | undefined;
  destinationPackets: string | undefined;
}>(({ contextId, eventId, destinationBytes, destinationBytesPercent, destinationPackets }) => {
  const destinationArrowHeight =
    destinationBytesPercent != null
      ? getArrowHeightFromPercent(destinationBytesPercent)
      : DEFAULT_ARROW_HEIGHT;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="center">
      <EuiFlexItem grow={false}>
        <ArrowHead direction="arrowLeft" />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <ArrowBody height={destinationArrowHeight} />
      </EuiFlexItem>

      {destinationBytes != null && !isNaN(Number(destinationBytes)) ? (
        <EuiFlexItem grow={false}>
          <DefaultDraggable
            field={DESTINATION_BYTES_FIELD_NAME}
            id={`${contextId}-${eventId}-${DESTINATION_BYTES_FIELD_NAME}-${destinationBytes}`}
            value={destinationBytes}
          >
            <Data size="xs">
              {destinationBytesPercent != null ? (
                <Percent data-test-subj="destination-bytes-percent">
                  {`(${numeral(destinationBytesPercent).format('0.00')}%)`}
                </Percent>
              ) : null}
              <span data-test-subj="destination-bytes">
                {numeral(destinationBytes).format('0.000 b')}
              </span>
            </Data>
          </DefaultDraggable>
        </EuiFlexItem>
      ) : null}

      <EuiFlexItem grow={false}>
        <ArrowBody height={destinationArrowHeight} />
      </EuiFlexItem>

      {destinationPackets != null && !isNaN(Number(destinationPackets)) ? (
        <EuiFlexItem grow={false}>
          <DefaultDraggable
            field={DESTINATION_PACKETS_FIELD_NAME}
            id={`${contextId}-${eventId}-${DESTINATION_PACKETS_FIELD_NAME}-${destinationPackets}`}
            value={destinationPackets}
          >
            <Data size="xs">
              <span data-test-subj="destination-packets">{`${numeral(destinationPackets).format(
                '0,0'
              )} ${i18n.PACKETS}`}</span>
            </Data>
          </DefaultDraggable>
        </EuiFlexItem>
      ) : null}

      <EuiFlexItem grow={false}>
        <ArrowBody height={destinationArrowHeight} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

/**
 * Visualizes the communication between a source and a destination using arrows
 * that grow in thickness based on the percentage of bytes transferred, and stats badges
 */
export const SourceDestinationArrows = pure<{
  contextId: string;
  destinationBytes?: string[] | null;
  destinationPackets?: string[] | null;
  eventId: string;
  sourceBytes?: string[] | null;
  sourcePackets?: string[] | null;
}>(({ contextId, destinationBytes, destinationPackets, eventId, sourceBytes, sourcePackets }) => {
  const maybeSourceBytes =
    sourceBytes != null && hasOneValue(sourceBytes) ? sourceBytes[0] : undefined;

  const maybeSourcePackets =
    sourcePackets != null && hasOneValue(sourcePackets) ? sourcePackets[0] : undefined;

  const maybeDestinationBytes =
    destinationBytes != null && hasOneValue(destinationBytes) ? destinationBytes[0] : undefined;

  const maybeDestinationPackets =
    destinationPackets != null && hasOneValue(destinationPackets)
      ? destinationPackets[0]
      : undefined;

  const maybeSourceBytesPercent =
    maybeSourceBytes != null && maybeDestinationBytes != null
      ? getPercent({
          numerator: Math.min(Number(maybeSourceBytes), Number(maybeDestinationBytes)),
          denominator: Math.max(Number(maybeSourceBytes), Number(maybeDestinationBytes)),
        })
      : undefined;

  const maybeDestinationBytesPercent =
    maybeSourceBytesPercent != null ? 100 - maybeSourceBytesPercent : undefined;

  return (
    <SourceDestinationArrowsContainer
      alignItems="center"
      data-test-subj="source-destination-arrows-container"
      justifyContent="center"
      direction="column"
      gutterSize="none"
    >
      {maybeSourceBytes != null ? (
        <EuiFlexItem grow={false}>
          <SourceArrow
            contextId={contextId}
            sourceBytes={maybeSourceBytes}
            sourcePackets={maybeSourcePackets}
            sourceBytesPercent={maybeSourceBytesPercent}
            eventId={eventId}
          />
        </EuiFlexItem>
      ) : null}

      {maybeDestinationBytes != null ? (
        <EuiFlexItem grow={false}>
          <DestinationArrow
            contextId={contextId}
            destinationBytes={maybeDestinationBytes}
            destinationPackets={maybeDestinationPackets}
            destinationBytesPercent={maybeDestinationBytesPercent}
            eventId={eventId}
          />
        </EuiFlexItem>
      ) : null}
    </SourceDestinationArrowsContainer>
  );
});
