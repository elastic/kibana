/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiI18nNumber,
  EuiSpacer,
  EuiText,
  EuiDescriptionList,
  EuiCode,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import styled from 'styled-components';
import { RelatedEventDataEntryWithStats } from '../../types';
import { CrumbInfo, formatDate, StyledBreadcrumbs } from '../panel';
import * as event from '../../../../common/endpoint/models/event';
import { ResolverEvent } from '../../../../common/endpoint/types';

export const BoldCode = styled(EuiCode)`
  &.euiCodeBlock code.euiCodeBlock__code {
    font-weight: 900;
  }
`;

/**
 * A helper function to turn objects into EuiDescriptionList entries.
 * This reflects the strategy of more or less "dumping" metadata for related processes
 * in description lists with little/no 'prettification'. This has the obvious drawback of
 * data perhaps appearing inscrutable/daunting, but the benefit of presenting these fields
 * to the user "as they occur" in ECS, which may help them with e.g. EQL queries.
 *
 * @param {object} obj The object to turn into `<dt><dd>` entries
 */
const objectToDescriptionListEntries = function* (
  obj: object,
  prefix = ''
): Generator<{ title: string; description: string }> {
  const nextPrefix = prefix.length ? `${prefix}/` : '';
  for (const [metaKey, metaValue] of Object.entries(obj)) {
    if (typeof metaValue === 'number' || typeof metaValue === 'string') {
      yield { title: nextPrefix + metaKey, description: `${metaValue}` };
    } else if (metaValue instanceof Array) {
      yield {
        title: nextPrefix + metaKey,
        description: metaValue
          .filter((arrayEntry) => {
            return typeof arrayEntry === 'number' || typeof arrayEntry === 'string';
          })
          .join(','),
      };
    } else if (typeof metaValue === 'object') {
      yield* objectToDescriptionListEntries(metaValue, nextPrefix + metaKey);
    }
  }
};

// Adding some styles to prevent horizontal scrollbars, per request from UX review
const StyledDescriptionList = memo(styled(EuiDescriptionList)`
  &.euiDescriptionList.euiDescriptionList--column dt.euiDescriptionList__title.desc-title {
    max-width: 8em;
  }
  &.euiDescriptionList.euiDescriptionList--column dd.euiDescriptionList__description {
    max-width: calc(100% - 8.5em);
    overflow-wrap: break-word;
  }
`);

// Styling subtitles, per UX review:
const StyledFlexTitle = memo(styled('h4')`
  display: flex;
  flex-flow: row;
`);
const StyledTitleRule = memo(styled('hr')`
  &.euiHorizontalRule.euiHorizontalRule--full.euiHorizontalRule--marginSmall.override {
    display: block;
    flex: 1;
    margin-left: 0.5em;
  }
`);

const TitleHr = memo(() => {
  return (
    <StyledTitleRule className="euiHorizontalRule euiHorizontalRule--full euiHorizontalRule--marginSmall override" />
  );
});
TitleHr.displayName = 'TitleHR';

/**
 * This view presents a detailed view of all the available data for a related event, split and titled by the "section"
 * it appears in the underlying ResolverEvent
 */
export const RelatedEventDetail = memo(function RelatedEventDetail({
  relatedEvent,
  parentEvent,
  pushToQueryParams,
  relatedEventsState,
  eventType,
}: {
  relatedEvent: ResolverEvent;
  parentEvent?: ResolverEvent;
  pushToQueryParams: (arg0: CrumbInfo) => unknown;
  relatedEventsState: RelatedEventDataEntryWithStats;
  eventType: string;
}) {
  const processName = (parentEvent && event.eventName(parentEvent)) || '*';
  const processEntityId = event.entityId(relatedEvent);
  const totalCount = Object.values(relatedEventsState.stats).reduce((a, v) => {
    return a + v;
  }, 0);
  const eventsString = i18n.translate(
    'xpack.siem.endpoint.resolver.panel.relatedEventDetail.events',
    {
      defaultMessage: 'Events',
    }
  );

  const matchingEvents = useMemo(() => {
    return relatedEventsState.relatedEvents.reduce(
      (matchingSet: ResolverEvent[], { relatedEvent: candidateEvent, relatedEventType }) => {
        if (relatedEventType === eventType) {
          matchingSet.push(candidateEvent);
        }
        return matchingSet;
      },
      []
    );
  }, [relatedEventsState, eventType]);

  const [sections, formattedDate] = useMemo(() => {
    const { agent, ecs, process, ...relevantData } = relatedEvent as ResolverEvent & {
      ecs: unknown;
    };
    let displayDate = '';
    const sectionData: Array<{
      sectionTitle: string;
      entries: Array<{ title: string; description: string }>;
    }> = Object.entries(relevantData)
      .map(([sectionTitle, val]) => {
        if (sectionTitle === '@timestamp') {
          displayDate = formatDate(val);
          return { sectionTitle: '', entries: [] };
        }
        if (typeof val !== 'object') {
          return { sectionTitle, entries: [{ title: sectionTitle, description: `${val}` }] };
        }
        return { sectionTitle, entries: [...objectToDescriptionListEntries(val)] };
      })
      .filter((v) => v.sectionTitle !== '' && v.entries.length);
    return [sectionData, displayDate];
  }, [relatedEvent]);

  const crumbs = useMemo(() => {
    return [
      {
        text: eventsString,
        onClick: () => {
          pushToQueryParams({ crumbId: '', crumbEvent: '' });
        },
      },
      {
        text: processName,
        onClick: () => {
          pushToQueryParams({ crumbId: processEntityId, crumbEvent: '' });
        },
      },
      {
        text: (
          <>
            <EuiI18nNumber value={totalCount} />
            {/* Non-breaking space->*/ ` ${eventsString}`}
          </>
        ),
        onClick: () => {
          pushToQueryParams({ crumbId: processEntityId, crumbEvent: 'all' });
        },
      },
      {
        text: (
          <>
            <EuiI18nNumber value={matchingEvents.length} />
            {/* Non-breaking space->*/ ` ${eventType}`}
          </>
        ),
        onClick: () => {
          pushToQueryParams({ crumbId: processEntityId, crumbEvent: eventType });
        },
      },
      {
        text: event.descriptiveName(relatedEvent),
        onClick: () => {},
      },
    ];
  }, [
    processName,
    processEntityId,
    matchingEvents,
    eventType,
    eventsString,
    pushToQueryParams,
    relatedEvent,
    totalCount,
  ]);

  return (
    <>
      <StyledBreadcrumbs truncate={false} breadcrumbs={crumbs} />
      <EuiSpacer size="l" />
      <EuiText>
        <BoldCode>{`${eventType} ${event.ecsEventType(relatedEvent)}`}</BoldCode>
        {' @ '}
        {formattedDate}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText>{event.descriptiveName(relatedEvent)}</EuiText>
      <EuiSpacer size="l" />
      {sections.map(({ sectionTitle, entries }, index) => {
        return (
          <>
            <EuiTitle size="xs">
              <EuiTextColor color="subdued">
                <StyledFlexTitle>
                  {sectionTitle}
                  <TitleHr />
                </StyledFlexTitle>
              </EuiTextColor>
            </EuiTitle>
            <StyledDescriptionList
              type="column"
              align="left"
              titleProps={{ className: 'desc-title' }}
              compressed
              listItems={entries}
            />
            {index === sections.length - 1 ? null : <EuiSpacer size="s" />}
          </>
        );
      })}
    </>
  );
});
RelatedEventDetail.displayName = 'RelatedEventDetail';
