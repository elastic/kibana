/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTextColor, EuiFlexItem } from '@elastic/eui';
import { ALERT_REASON } from '@kbn/rule-data-utils';

import React, { useMemo } from 'react';

import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { EVENT_DETAILS_PLACEHOLDER } from '../../../timelines/components/side_panel/event_details/translations';
import { getFieldValue } from '../../../detections/components/host_isolation/helpers';

interface Props {
  data: TimelineEventsDetailsItem[];
  eventId: string;
}

export const ReasonComponent: React.FC<Props> = ({ eventId, data }) => {
  const reason = useMemo(() => {
    const siemSignalsReason = getFieldValue(
      { category: 'signal', field: 'signal.alert.reason' },
      data
    );
    const aadReason = getFieldValue({ category: 'kibana', field: ALERT_REASON }, data);
    return aadReason.length > 0 ? aadReason : siemSignalsReason;
  }, [data]);

  if (!eventId) {
    return <EuiTextColor color="subdued">{EVENT_DETAILS_PLACEHOLDER}</EuiTextColor>;
  }

  return reason ? <EuiFlexItem grow={false}>{reason}</EuiFlexItem> : null;
};

ReasonComponent.displayName = 'ReasonComponent';

export const Reason = React.memo(ReasonComponent);
