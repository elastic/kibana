/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo, useRef, useState, useEffect } from 'react';

import {
  EuiDescriptionList,
  EuiSpacer,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiButtonEmpty,
} from '@elastic/eui';
import styled from 'styled-components';

import { get, getOr } from 'lodash/fp';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import * as i18n from './translations';
import { BrowserFields } from '../../../../common/search_strategy/index_fields';

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
const LINE_CLAMP = 3;

const LineClamp = styled.div<{
  line?: number | 'none';
  maxHeight?: number | 'none';
}>`
  display: -webkit-box;
  -webkit-line-clamp: ${({ line = LINE_CLAMP }) => line};
  -webkit-box-orient: vertical;
  overflow: scroll;
  max-height: ${({ maxHeight = 'none' }) => (maxHeight === 'none' ? 'none' : `${maxHeight}em`)}};
`;

LineClamp.displayName = 'LineClamp';

const StyledDescription = styled(EuiDescriptionListDescription)`
  word-break: break-all;
`;

StyledDescription.displayName = 'StyledDescription';

const ReadMore = styled(EuiButtonEmpty)`
  span.euiButtonContent {
    padding: 0;
  }
`;

ReadMore.displayName = 'ReadMore';

const SummaryViewComponent: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  timelineId: string;
}> = ({ data, eventId, timelineId, browserFields }) => {
  const summaryList = useMemo(() => {
    return (data || []).reduce<Summary>((acc, item) => {
      const fieldValue = getOr(null, 'values.0', item);
      const eventCategory = item.category;
      const fieldType = getOr(
        'string',
        `${eventCategory}.fields.${item.field}.type`,
        browserFields
      );
      const fieldFormat = get(`${eventCategory}.fields.${item.field}.format`, browserFields);
      return fields.indexOf(item.field) >= 0
        ? [
            ...acc,
            {
              title: item.field,
              description: (
                <FormattedFieldValue
                  contextId={`alert-details-value-formatted-field-value-${timelineId}-${eventId}-${item.field}-${fieldValue}`}
                  eventId={eventId}
                  fieldFormat={fieldFormat}
                  fieldName={item.field}
                  fieldType={fieldType}
                  value={fieldValue}
                />
              ),
            },
          ]
        : acc;
    }, []);
  }, [data, eventId, timelineId, browserFields]);

  const messageData = useMemo(() => (data || []).find((item) => item.field === 'message'), [data]);
  const message = get('values.0', messageData);
  const [lineClamp, setLineClamp] = useState<number | 'none'>(LINE_CLAMP);
  const [lineClampHeight, setLineClampHeight] = useState<number | 'none'>(4.5);
  const [readMoreButtonText, setReadMoreButtonText] = useState(i18n.READ_MORE);
  const [isOverflow, setIsOverflow] = useState(false);
  const descriptionRef = useRef<HTMLElement>();
  const toggleReadMore = () => {
    setLineClamp((prevState) => (prevState !== 'none' ? 'none' : LINE_CLAMP));
    setLineClampHeight((prevState) => (prevState !== 'none' ? 'none' : 4.5));
    setReadMoreButtonText((prevState) =>
      prevState === i18n.READ_MORE ? i18n.READ_LESS : i18n.READ_MORE
    );
  };

  useEffect(() => {
    if (
      message &&
      descriptionRef &&
      descriptionRef?.current &&
      descriptionRef?.current?.scrollHeight != null &&
      descriptionRef?.current?.clientHeight != null &&
      descriptionRef?.current?.scrollHeight > descriptionRef?.current?.clientHeight
    ) {
      setIsOverflow(true);
    }
  }, [descriptionRef, message]);

  return (
    <>
      <EuiSpacer />
      <EuiDescriptionList type="responsiveColumn" listItems={summaryList} compressed />
      {message && (
        <>
          <EuiSpacer />
          <EuiDescriptionList compressed>
            <EuiDescriptionListTitle>{i18n.INVESTIGATION_GUIDE}</EuiDescriptionListTitle>
            <StyledDescription>
              <LineClamp line={lineClamp} maxHeight={lineClampHeight} ref={descriptionRef}>
                {message}
              </LineClamp>
            </StyledDescription>
          </EuiDescriptionList>
          {(isOverflow || readMoreButtonText === i18n.READ_LESS) && (
            <ReadMore onClick={toggleReadMore} size="s">
              {readMoreButtonText}
            </ReadMore>
          )}
        </>
      )}
    </>
  );
};

SummaryViewComponent.displayName = 'SummaryViewComponent';

export const SummaryView = React.memo(SummaryViewComponent);
