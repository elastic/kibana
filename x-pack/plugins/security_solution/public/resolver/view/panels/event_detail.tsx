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
import { DescriptiveName } from './descriptive_name';
import { useLinkProps } from '../use_link_props';

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

  const totalCount = useSelector(
    (state: ResolverState) => selectors.relatedEventsStats(state)(nodeID)?.events.total
  );

  const processName = parentEvent ? event.processName(parentEvent) : null;

  const relatedsReadyMap = useSelector(selectors.relatedEventsReady);
  const relatedsReady = relatedsReadyMap.get(nodeID!);
  const dispatch = useResolverDispatch();
  const nodesLinkNavProps = useLinkProps({
    panelView: 'nodes',
  });

  /**
   * If we don't have the related events for the parent yet, use this effect
   * to request them.
   */
  useEffect(() => {
    if (typeof relatedsReady === 'undefined' && nodeID !== null && nodeID !== undefined) {
      dispatch({
        type: 'appDetectedMissingEventData',
        payload: nodeID,
      });
    }
  }, [relatedsReady, dispatch, nodeID]);

  const [
    relatedEventToShowDetailsFor,
    countBySameCategory,
    relatedEventCategory = i18n.translate(
      'xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.NA',
      {
        defaultMessage: 'N/A',
      }
    ),
    sections,
    formattedDate,
  ] = useSelector((state: ResolverState) =>
    selectors.relatedEventDisplayInfoByEntityAndSelfId(state)(nodeID, eventID)
  );

  const nodeDetailLinkNavProps = useLinkProps({
    panelView: 'nodeDetail',
    panelParameters: { nodeID },
  });

  const nodeEventsLinkNavProps = useLinkProps({
    panelView: 'nodeEvents',
    panelParameters: { nodeID },
  });

  const nodeEventsOfTypeLinkNavProps = useLinkProps({
    panelView: 'nodeEventsOfType',
    panelParameters: { nodeID, eventType: relatedEventCategory },
  });
  const crumbs = useMemo(() => {
    return [
      {
        text: i18n.translate(
          'xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.events',
          {
            defaultMessage: 'Events',
          }
        ),
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
      },
    ];
  }, [
    totalCount,
    processName,
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
