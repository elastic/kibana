/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/target/types/react';
import { DataStream } from '../../../../../../common';
import { isFleetManaged } from '../../../../lib/data_streams';

interface Props {
  dataStream: DataStream;
}

export const DataStreamsBadges: React.FunctionComponent<Props> = ({ dataStream }) => {
  return (
    <>
      {isFleetManaged(dataStream) ? (
        <Fragment>
          &nbsp;
          <EuiBadge color="hollow">
            <FormattedMessage
              id="xpack.idxMgmt.dataStreamList.table.managedDataStreamBadge"
              defaultMessage="Managed"
            />
          </EuiBadge>
        </Fragment>
      ) : null}
      {dataStream.hidden ? (
        <Fragment>
          &nbsp;
          <EuiBadge color="hollow">
            <FormattedMessage
              id="xpack.idxMgmt.dataStreamList.table.hiddenDataStreamBadge"
              defaultMessage="Hidden"
            />
          </EuiBadge>
        </Fragment>
      ) : null}
    </>
  );
};
