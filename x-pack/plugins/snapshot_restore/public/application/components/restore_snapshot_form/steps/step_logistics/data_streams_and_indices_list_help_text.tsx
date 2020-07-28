/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink } from '@elastic/eui';

interface Props {
  onSelectionChange: (selection: 'all' | 'none') => void;
  selectedIndicesAndDataStreams: string[];
  indices: string[];
  dataStreams: string[];
}

export const DataStreamsAndIndicesListHelpText: FunctionComponent<Props> = ({
  onSelectionChange,
  selectedIndicesAndDataStreams,
  indices,
  dataStreams,
}) => {
  if (selectedIndicesAndDataStreams.length === 0) {
    return (
      <FormattedMessage
        id="xpack.snapshotRestore.restoreForm.stepLogistics.noDataStreamsOrIndicesHelpText"
        defaultMessage="Nothing will be restored. {selectAllLink}"
        values={{
          selectAllLink: (
            <EuiLink
              onClick={() => {
                onSelectionChange('all');
              }}
            >
              <FormattedMessage
                id="xpack.snapshotRestore.restoreForm.stepLogistics.selectAllIndicesLink"
                defaultMessage="Select all"
              />
            </EuiLink>
          ),
        }}
      />
    );
  }

  const indicesCount = selectedIndicesAndDataStreams.reduce(
    (acc, v) => (indices.includes(v) ? acc + 1 : acc),
    0
  );
  const dataStreamsCount = selectedIndicesAndDataStreams.reduce(
    (acc, v) => (dataStreams.includes(v) ? acc + 1 : acc),
    0
  );

  return (
    <FormattedMessage
      id="xpack.snapshotRestore.restoreForm.stepLogistics.selectDataStreamsAndIndicesHelpText"
      defaultMessage="{indicesCount} {indicesCount, plural, one {index} other {indices}} and {dataStreamsCount} {dataStreamsCount, plural, one {data stream} other {data streams}} will be restored. {deselectAllLink}"
      values={{
        dataStreamsCount,
        indicesCount,
        deselectAllLink: (
          <EuiLink
            data-test-subj="deselectIndicesLink"
            onClick={() => {
              onSelectionChange('none');
            }}
          >
            <FormattedMessage
              id="xpack.snapshotRestore.restoreForm.stepLogistics.deselectAllIndicesLink"
              defaultMessage="Deselect all"
            />
          </EuiLink>
        ),
      }}
    />
  );
};
