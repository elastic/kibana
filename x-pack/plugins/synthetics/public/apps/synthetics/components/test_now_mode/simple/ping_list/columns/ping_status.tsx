/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { EuiBadge, EuiSpacer, EuiText } from '@elastic/eui';
import { STATUS } from '../../../../../../../../common/constants';
import { Ping } from '../../../../../../../../common/runtime_types';
import {
  STATUS_DOWN_LABEL,
  STATUS_UP_LABEL,
} from '../../../../../../../../common/translations/translations';

interface Props {
  pingStatus: string;
  item: Ping;
}

const getPingStatusLabel = (status: string) => {
  return status === 'up' ? STATUS_UP_LABEL : STATUS_DOWN_LABEL;
};

export const PingStatusColumn = ({ pingStatus, item }: Props) => {
  const timeStamp = moment(item.timestamp);

  let checkedTime = '';

  if (moment().diff(timeStamp, 'd') > 1) {
    checkedTime = timeStamp.format('ll LTS');
  } else {
    checkedTime = timeStamp.format('LTS');
  }

  return (
    <div data-test-subj={`xpack.synthetics.pingList.ping-${item.docId}`}>
      <EuiBadge className="eui-textCenter" color={pingStatus === STATUS.UP ? 'success' : 'danger'}>
        {getPingStatusLabel(pingStatus)}
      </EuiBadge>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.synthetics.pingList.recencyMessage', {
          values: { fromNow: checkedTime },
          defaultMessage: 'Checked {fromNow}',
          description:
            'A string used to inform our users how long ago Heartbeat pinged the selected host.',
        })}
      </EuiText>
    </div>
  );
};
