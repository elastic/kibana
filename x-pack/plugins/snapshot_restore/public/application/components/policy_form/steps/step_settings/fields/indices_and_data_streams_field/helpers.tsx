/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSelectableOption } from '@elastic/eui';
import { orderDataStreamsAndIndices } from '../../../../../lib';
import { DataStreamBadge } from '../../../../../data_stream_badge';

export const mapSelectionToIndicesOptions = ({
  allSelected,
  selection,
  dataStreams,
  indices,
}: {
  allSelected: boolean;
  selection: string[];
  dataStreams: string[];
  indices: string[];
}): EuiSelectableOption[] => {
  return orderDataStreamsAndIndices<EuiSelectableOption>({
    dataStreams: dataStreams.map(
      (dataStream): EuiSelectableOption => {
        return {
          label: dataStream,
          append: <DataStreamBadge />,
          checked: allSelected || selection.includes(dataStream) ? 'on' : undefined,
        };
      }
    ),
    indices: indices.map(
      (index): EuiSelectableOption => {
        return {
          label: index,
          checked: allSelected || selection.includes(index) ? 'on' : undefined,
        };
      }
    ),
  });
};

/**
 * @remark
 * Users with more than 100 indices will probably want to use an index pattern to select
 * them instead, so we'll default to showing them the index pattern input. Also show the custom
 * list if we have no exact matches in the configured array to some existing index.
 */
export const determineListMode = ({
  configuredIndices,
  indices,
  dataStreams,
}: {
  configuredIndices: string | string[] | undefined;
  indices: string[];
  dataStreams: string[];
}): 'custom' | 'list' => {
  const indicesAndDataStreams = indices.concat(dataStreams);
  return typeof configuredIndices === 'string' ||
    indicesAndDataStreams.length > 100 ||
    (Array.isArray(configuredIndices) &&
      // If not every past configured index maps to an existing index or data stream
      // we also show the custom list
      !configuredIndices.every((c) => indicesAndDataStreams.some((i) => i === c)))
    ? 'custom'
    : 'list';
};
