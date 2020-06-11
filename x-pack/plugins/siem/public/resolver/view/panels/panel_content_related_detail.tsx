/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiI18nNumber,
  EuiBreadcrumbs,
  EuiSpacer,
  EuiText,
  EuiCard,
  EuiDescriptionList,
  EuiCode,
} from '@elastic/eui';
import styled from 'styled-components';
import { RelatedEventDataEntryWithStats } from '../../types';
import { CrumbInfo, formatDate } from '../panel';
import * as event from '../../../../common/endpoint/models/event';
import { ResolverEvent } from '../../../../common/endpoint/types';

export const BoldCode = styled(EuiCode)`
  &.euiCodeBlock code.euiCodeBlock__code {
    font-weight: 900;
  }
`;

/**
 * A helper function to turn objects into EuiDescriptionList entries
 * @param obj
 * @param prefix
 */
const surfacePrimitives = function* (
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
      yield* surfacePrimitives(metaValue, nextPrefix + metaKey);
    }
  }
};

/**
 * This view presents a detailed view of all the available data for a related event, split and titled by the "section"
 * it appears in the underlying ResolverEvent
 */
export const RelatedEventDetail = memo(function RelatedEventDetail({
  relatedEvent,
  pushToQueryParams,
  relatedEventsState,
  eventType,
}: {
  relatedEvent: ResolverEvent;
  pushToQueryParams: (arg0: CrumbInfo) => unknown;
  relatedEventsState: RelatedEventDataEntryWithStats;
  eventType: string;
}) {
  const processName = relatedEvent && event.eventName(relatedEvent);
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

  const sections = useMemo(() => {
    const { agent, ecs, process, ...relevantData } = relatedEvent as ResolverEvent & {
      ecs: unknown;
    };
    const sectionData: Array<{
      sectionTitle: string;
      entries: Array<{ title: string; description: string }>;
    }> = Object.entries(relevantData).map(([sectionTitle, val]) => {
      if (sectionTitle === '@timestamp') {
        return { sectionTitle, entries: [{ title: 'time', description: formatDate(val) }] };
      }
      if (typeof val !== 'object') {
        return { sectionTitle, entries: [{ title: sectionTitle, description: `${val}` }] };
      }
      return { sectionTitle, entries: [...surfacePrimitives(val)] };
    });
    return sectionData;
  }, []);

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
  }, []);

  return (
    <>
      <EuiBreadcrumbs truncate={false} breadcrumbs={crumbs} />
      <EuiSpacer size="l" />
      <EuiText textAlign="center">
        <BoldCode>{`${eventType} ${event.ecsEventType(relatedEvent)}`}</BoldCode>
      </EuiText>
      <EuiText textAlign="center">{event.descriptiveName(relatedEvent)}</EuiText>
      <EuiSpacer size="l" />
      {sections.map(({ sectionTitle, entries }) => {
        return (
          <EuiCard title={sectionTitle} description={''}>
            <EuiDescriptionList type="inline" listItems={entries} />
          </EuiCard>
        );
      })}
    </>
  );
});
RelatedEventDetail.displayName = 'RelatedEventDetail';
