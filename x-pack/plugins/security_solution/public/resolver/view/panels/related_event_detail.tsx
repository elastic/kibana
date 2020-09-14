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
import { StyledBreadcrumbs, BoldCode, StyledTime, GeneratedText } from './panel_content_utilities';
import * as event from '../../../../common/endpoint/models/event';
import { ResolverEvent } from '../../../../common/endpoint/types';
import * as selectors from '../../store/selectors';
import { useResolverDispatch } from '../use_resolver_dispatch';
import { PanelContentError } from './panel_content_error';
import { ResolverState } from '../../types';
import { useReplaceBreadcrumbParameters } from '../use_replace_breadcrumb_parameters';

// Adding some styles to prevent horizontal scrollbars, per request from UX review
const StyledDescriptionList = memo(styled(EuiDescriptionList)`
  &.euiDescriptionList.euiDescriptionList--column dt.euiDescriptionList__title.desc-title {
    max-width: 8em;
    overflow-wrap: break-word;
  }
  &.euiDescriptionList.euiDescriptionList--column dd.euiDescriptionList__description {
    max-width: calc(100% - 8.5em);
    overflow-wrap: break-word;
  }
`);

// Also prevents horizontal scrollbars on long descriptive names
const StyledDescriptiveName = memo(styled(EuiText)`
  padding-right: 1em;
  overflow-wrap: break-word;
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
 * Take description list entries and prepare them for display by
 * seeding with `<wbr />` tags.
 *
 * @param entries {title: string, description: string}[]
 */
function entriesForDisplay(entries: Array<{ title: string; description: string }>) {
  return entries.map((entry) => {
    return {
      description: <GeneratedText>{entry.description}</GeneratedText>,
      title: <GeneratedText>{entry.title}</GeneratedText>,
    };
  });
}

/**
 * This view presents a detailed view of all the available data for a related event, split and titled by the "section"
 * it appears in the underlying ResolverEvent
 */
export const RelatedEventDetail = memo(function ({
  relatedEventId,
  parentEvent,
  countForParent,
}: {
  relatedEventId: string;
  parentEvent: ResolverEvent;
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

  const [
    relatedEventToShowDetailsFor,
    countBySameCategory,
    relatedEventCategory = naString,
    sections,
    formattedDate,
  ] = useSelector((state: ResolverState) =>
    selectors.relatedEventDisplayInfoByEntityAndSelfId(state)(processEntityId, relatedEventId)
  );

  const pushToQueryParams = useReplaceBreadcrumbParameters();

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
    return <PanelContentError translatedErrorMessage={errString} />;
  }

  return (
    <>
      <StyledBreadcrumbs breadcrumbs={crumbs} />
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
        <StyledTime dateTime={formattedDate}>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.atTime"
            values={{ date: formattedDate }}
            defaultMessage="@ {date}"
          />
        </StyledTime>
      </EuiText>
      <EuiSpacer size="m" />
      <StyledDescriptiveName>
        <GeneratedText>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.eventDescriptiveNameInTitle"
            values={{ subject, descriptor }}
            defaultMessage="{descriptor} {subject}"
          />
        </GeneratedText>
      </StyledDescriptiveName>
      <EuiSpacer size="l" />
      {sections.map(({ sectionTitle, entries }, index) => {
        const displayEntries = entriesForDisplay(entries);
        return (
          <Fragment key={index}>
            {index === 0 ? null : <EuiSpacer size="m" />}
            <EuiTitle size="xxxs">
              <EuiTextColor color="subdued">
                <StyledFlexTitle>
                  {sectionTitle}
                  <TitleHr />
                </StyledFlexTitle>
              </EuiTextColor>
            </EuiTitle>
            <EuiSpacer size="m" />
            <StyledDescriptionList
              type="column"
              align="left"
              titleProps={{ className: 'desc-title' }}
              compressed
              listItems={displayEntries}
            />
            {index === sections.length - 1 ? null : <EuiSpacer size="m" />}
          </Fragment>
        );
      })}
    </>
  );
});
