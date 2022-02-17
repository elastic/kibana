/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataStream } from '../../../../../common';
import { isFleetManaged } from '../../../lib/data_streams';

interface Props {
  dataStream: DataStream;
}

export const DataStreamsBadges: React.FunctionComponent<Props> = ({ dataStream }) => {
  const badges = [];
  if (isFleetManaged(dataStream)) {
    badges.push(
      <EuiBadge color="hollow" key={'managed'}>
        <FormattedMessage
          id="xpack.idxMgmt.dataStreamList.table.managedDataStreamBadge"
          defaultMessage="Fleet-managed"
        />
      </EuiBadge>
    );
  }
  if (dataStream.hidden) {
    badges.push(
      <EuiBadge color="hollow" key={'hidden'}>
        <FormattedMessage
          id="xpack.idxMgmt.dataStreamList.table.hiddenDataStreamBadge"
          defaultMessage="Hidden"
        />
      </EuiBadge>
    );
  }
  return badges.length > 0 ? (
    <>
      &nbsp;
      <EuiBadgeGroup>{badges}</EuiBadgeGroup>
    </>
  ) : null;
};
