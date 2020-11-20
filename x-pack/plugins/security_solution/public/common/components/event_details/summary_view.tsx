/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo } from 'react';

import {
  EuiDescriptionList,
  EuiSpacer,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { get, getOr } from 'lodash/fp';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { OverflowField } from '../tables/helpers';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import * as i18n from './translations';

type Summary = Array<{ title: string; description: JSX.Element }>;

const fields = [
  '@timestamp',
  'signal.status',
  'signal.rule.name',
  'signal.rule.severity',
  'signal.rule.riskScore',
  'user.name',
  'host.name',
  'source.ip',
  'destination.ip',
];

const SummaryViewComponent: React.FC<{
  data: TimelineEventsDetailsItem[];
  eventId: string;
  columnHeaders: ColumnHeaderOptions[];
  timelineId: string;
}> = ({ data, eventId, columnHeaders, timelineId }) => {
  const summaryList = useMemo(() => {
    return data.reduce<Summary>((acc, item) => {
      const column = columnHeaders.find((c) => c.id === item.field);
      const fieldValue = getOr(null, 'values.0', item);
      return fields.indexOf(item.field) >= 0
        ? [
            ...acc,
            {
              title: item.field,
              description: (
                <FormattedFieldValue
                  contextId={`alert-details-value-formatted-field-value-${timelineId}-${eventId}-${item.field}-${fieldValue}`}
                  eventId={eventId}
                  fieldFormat={column?.format}
                  fieldName={item.field}
                  fieldType={column?.type ?? 'string'}
                  value={fieldValue}
                />
              ),
            },
          ]
        : acc;
    }, []);
  }, [data, columnHeaders, eventId, timelineId]);

  const messageData = useMemo(() => (data || []).find((item) => item.field === 'message'), [data]);
  const message = get('values.0', messageData);

  return (
    <>
      <EuiSpacer />
      <EuiDescriptionList type="responsiveColumn" listItems={summaryList} />
      {message && (
        <>
          <EuiSpacer />
          <EuiDescriptionList>
            <EuiDescriptionListTitle>{i18n.INVESTIGATION_GUIDE}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <OverflowField value={message} />
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </>
      )}
    </>
  );
};

SummaryViewComponent.displayName = 'SummaryViewComponent';

export const SummaryView = React.memo(SummaryViewComponent);
