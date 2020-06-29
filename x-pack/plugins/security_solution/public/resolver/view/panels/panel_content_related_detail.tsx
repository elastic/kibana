/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo, useEffect, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, EuiDescriptionList, EuiTextColor, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { CrumbInfo, formatDate, StyledBreadcrumbs, BoldCode } from './panel_content_utilities';
import * as event from '../../../../common/endpoint/models/event';
import { ResolverEvent } from '../../../../common/endpoint/types';
import * as selectors from '../../store/selectors';
import { useResolverDispatch } from '../use_resolver_dispatch';
import { PanelContentError } from './panel_content_error';

/**
 * A helper function to turn objects into EuiDescriptionList entries.
 * This reflects the strategy of more or less "dumping" metadata for related processes
 * in description lists with little/no 'prettification'. This has the obvious drawback of
 * data perhaps appearing inscrutable/daunting, but the benefit of presenting these fields
 * to the user "as they occur" in ECS, which may help them with e.g. EQL queries.
 *
 * Given an object like: {a:{b: 1}, c: 'd'} it will yield title/description entries like so:
 * {title: "a.b", description: "1"}, {title: "c", description: "d"}
 *
 * @param {object} obj The object to turn into `<dt><dd>` entries
 */
const objectToDescriptionListEntries = function* (
  obj: object,
  prefix = ''
): Generator<{ title: string; description: string }> {
  const nextPrefix = prefix.length ? `${prefix}.` : '';
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
const StyledFlexTitle = memo(styled('h3')`
  display: flex;
  flex-flow: row;
  font-size: 1.2em;
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
  relatedEventId,
  parentEvent,
  pushToQueryParams,
  countForParent,
}: {
  relatedEventId: string;
  parentEvent: ResolverEvent;
  pushToQueryParams: (queryStringKeyValuePair: CrumbInfo) => unknown;
  countForParent: number | undefined;
}) {
  const processName = (parentEvent && event.eventName(parentEvent)) || '*';
  const processEntityId = parentEvent && event.entityId(parentEvent);
  const totalCount = countForParent || 0;
  const eventsString = i18n.translate(
    'xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.events',
    {
      defaultMessage: 'Events',
    }
  );
  const naString = i18n.translate(
    'xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.NA',
    {
      defaultMessage: 'N/A',
    }
  );

  const relatedsReadyMap = useSelector(selectors.relatedEventsReady);
  const relatedsReady = relatedsReadyMap.get(processEntityId!);
  const dispatch = useResolverDispatch();

  /**
   * If we don't have the related events for the parent yet, use this effect
   * to request them.
   */
  useEffect(() => {
    if (typeof relatedsReady === 'undefined') {
      dispatch({
        type: 'appDetectedMissingEventData',
        payload: processEntityId,
      });
    }
  }, [relatedsReady, dispatch, processEntityId]);

  const relatedEventsForThisProcess = useSelector(selectors.relatedEventsByEntityId).get(
    processEntityId!
  );

  const [relatedEventToShowDetailsFor, countBySameCategory, relatedEventCategory] = useMemo(() => {
    if (!relatedEventsForThisProcess) {
      return [undefined, 0];
    }
    const specificEvent = relatedEventsForThisProcess.events.find(
      (evt) => event.eventId(evt) === relatedEventId
    );
    // For breadcrumbs:
    const specificCategory = specificEvent && event.primaryEventCategory(specificEvent);
    const countOfCategory = relatedEventsForThisProcess.events.reduce((sumtotal, evt) => {
      return event.primaryEventCategory(evt) === specificCategory ? sumtotal + 1 : sumtotal;
    }, 0);
    return [specificEvent, countOfCategory, specificCategory || naString];
  }, [relatedEventsForThisProcess, naString, relatedEventId]);

  const [sections, formattedDate] = useMemo(() => {
    if (!relatedEventToShowDetailsFor) {
      // This could happen if user relaods from URL param and requests an eventId that no longer exists
      return [[], naString];
    }
    // Assuming these details (agent, ecs, process) aren't as helpful, can revisit
    const {
      agent,
      ecs,
      process,
      ...relevantData
    } = relatedEventToShowDetailsFor as ResolverEvent & {
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
  }, [relatedEventToShowDetailsFor, naString]);

  const waitCrumbs = useMemo(() => {
    return [
      {
        text: eventsString,
        onClick: () => {
          pushToQueryParams({ crumbId: '', crumbEvent: '' });
        },
      },
    ];
  }, [pushToQueryParams, eventsString]);

  const { subject = '', descriptor = '' } = relatedEventToShowDetailsFor
    ? event.descriptiveName(relatedEventToShowDetailsFor)
    : {};
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
          pushToQueryParams({ crumbId: processEntityId!, crumbEvent: '' });
        },
      },
      {
        text: (
          <>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.numberOfEvents"
              values={{ totalCount }}
              defaultMessage="{totalCount} Events"
            />
          </>
        ),
        onClick: () => {
          pushToQueryParams({ crumbId: processEntityId!, crumbEvent: 'all' });
        },
      },
      {
        text: (
          <>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.countByCategory"
              values={{ count: countBySameCategory, category: relatedEventCategory }}
              defaultMessage="{count} {category}"
            />
          </>
        ),
        onClick: () => {
          pushToQueryParams({
            crumbId: processEntityId!,
            crumbEvent: relatedEventCategory || 'all',
          });
        },
      },
      {
        text: relatedEventToShowDetailsFor ? (
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.eventDescriptiveName"
            values={{ subject, descriptor }}
            defaultMessage="{descriptor} {subject}"
          />
        ) : (
          naString
        ),
        onClick: () => {},
      },
    ];
  }, [
    processName,
    processEntityId,
    eventsString,
    pushToQueryParams,
    totalCount,
    countBySameCategory,
    naString,
    relatedEventCategory,
    relatedEventToShowDetailsFor,
    subject,
    descriptor,
  ]);

  /**
   * If the ship hasn't come in yet, wait on the dock
   */
  if (!relatedsReady) {
    const waitingString = i18n.translate(
      'xpack.securitySolution.endpoint.resolver.panel.relatedDetail.wait',
      {
        defaultMessage: 'Waiting For Events...',
      }
    );
    return (
      <>
        <StyledBreadcrumbs breadcrumbs={waitCrumbs} />
        <EuiSpacer size="l" />
        <EuiTitle>
          <h4>{waitingString}</h4>
        </EuiTitle>
      </>
    );
  }

  /**
   * Could happen if user e.g. loads a URL with a bad crumbEvent
   */
  if (!relatedEventToShowDetailsFor) {
    const errString = i18n.translate(
      'xpack.securitySolution.endpoint.resolver.panel.relatedDetail.missing',
      {
        defaultMessage: 'Related event not found.',
      }
    );
    return (
      <PanelContentError translatedErrorMessage={errString} pushToQueryParams={pushToQueryParams} />
    );
  }

  return (
    <>
      <StyledBreadcrumbs truncate={false} breadcrumbs={crumbs} />
      <EuiSpacer size="l" />
      <EuiText size="s">
        <BoldCode>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.categoryAndType"
            values={{
              category: relatedEventCategory,
              eventType: String(event.ecsEventType(relatedEventToShowDetailsFor)),
            }}
            defaultMessage="{category} {eventType}"
          />
        </BoldCode>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.atTime"
          values={{ date: formattedDate }}
          defaultMessage="@ {date}"
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.eventDescriptiveNameInTitle"
          values={{ subject, descriptor }}
          defaultMessage="{descriptor} {subject}"
        />
      </EuiText>
      <EuiSpacer size="l" />
      {sections.map(({ sectionTitle, entries }, index) => {
        return (
          <Fragment key={index}>
            {index === 0 ? null : <EuiSpacer size="m" />}
            <EuiTitle size="xs">
              <EuiTextColor color="secondary">
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
            {index === sections.length - 1 ? null : <EuiSpacer size="m" />}
          </Fragment>
        );
      })}
    </>
  );
});
RelatedEventDetail.displayName = 'RelatedEventDetail';
