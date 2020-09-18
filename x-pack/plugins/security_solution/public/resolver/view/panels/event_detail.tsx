/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React, { memo, useMemo, useEffect, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, EuiDescriptionList, EuiTextColor, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { StyledPanel } from '../styles';
import { BoldCode, StyledTime, GeneratedText } from './panel_content_utilities';
import { Breadcrumbs } from './breadcrumbs';
import * as event from '../../../../common/endpoint/models/event';
import * as selectors from '../../store/selectors';
import { useResolverDispatch } from '../use_resolver_dispatch';
import { PanelContentError } from './panel_content_error';
import { PanelLoading } from './panel_loading';
import { ResolverState } from '../../types';
import { useNavigateOrReplace } from '../use_navigate_or_replace';
import { DescriptiveName } from './descriptive_name';

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
export const EventDetail = memo(function ({
  nodeID,
  eventID,
}: {
  nodeID: string;
  eventID: string;
}) {
  const parentEvent = useSelector((state: ResolverState) =>
    selectors.processEventForID(state)(nodeID)
  );

  const relatedEventsStats = useSelector((state: ResolverState) =>
    selectors.relatedEventsStats(state)(nodeID)
  );
  const countForParent: number = Object.values(relatedEventsStats?.events.byCategory || {}).reduce(
    (sum, val) => sum + val,
    0
  );
  const processName = (parentEvent && event.processName(parentEvent)) || '*';
  const processEntityId = (parentEvent && event.entityId(parentEvent)) || '';
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
  const nodesHref = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)({ panelView: 'nodes' })
  );
  const nodesLinkNavProps = useNavigateOrReplace({
    search: nodesHref,
  });

  /**
   * If we don't have the related events for the parent yet, use this effect
   * to request them.
   */
  useEffect(() => {
    if (
      typeof relatedsReady === 'undefined' &&
      processEntityId !== null &&
      processEntityId !== undefined
    ) {
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
    selectors.relatedEventDisplayInfoByEntityAndSelfId(state)(nodeID, eventID)
  );

  const nodeDetailHref = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)({
      panelView: 'nodeDetail',
      panelParameters: { nodeID: processEntityId },
    })
  );
  const nodeDetailLinkNavProps = useNavigateOrReplace({
    search: nodeDetailHref,
  });

  const nodeEventsHref = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)({
      panelView: 'nodeEvents',
      panelParameters: { nodeID: processEntityId },
    })
  );
  const nodeEventsLinkNavProps = useNavigateOrReplace({
    search: nodeEventsHref,
  });

  const nodeEventsOfTypeHref = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)({
      panelView: 'nodeEventsOfType',
      panelParameters: { nodeID: processEntityId, eventType: relatedEventCategory },
    })
  );
  const nodeEventsOfTypeLinkNavProps = useNavigateOrReplace({
    search: nodeEventsOfTypeHref,
  });
  const crumbs = useMemo(() => {
    return [
      {
        text: eventsString,
        ...nodesLinkNavProps,
      },
      {
        text: processName,
        ...nodeDetailLinkNavProps,
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
        ...nodeEventsLinkNavProps,
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
        ...nodeEventsOfTypeLinkNavProps,
      },
      {
        text: relatedEventToShowDetailsFor ? (
          <DescriptiveName event={relatedEventToShowDetailsFor} />
        ) : (
          i18n.translate('xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.NA', {
            defaultMessage: 'N/A',
          })
        ),
        onClick: () => {},
      },
    ];
  }, [
    processName,
    eventsString,
    totalCount,
    countBySameCategory,
    relatedEventCategory,
    relatedEventToShowDetailsFor,
    nodeEventsOfTypeLinkNavProps,
    nodeEventsLinkNavProps,
    nodeDetailLinkNavProps,
    nodesLinkNavProps,
  ]);

  if (!relatedsReady) {
    return <PanelLoading />;
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
    <StyledPanel>
      <Breadcrumbs breadcrumbs={crumbs} />
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
          <DescriptiveName event={relatedEventToShowDetailsFor} />
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
    </StyledPanel>
  );
});
