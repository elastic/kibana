/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiBasicTableColumn, Criteria } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { EventDocument } from '../hooks/use_fetch_system_overview';
import { useFlyoutFocusManagement } from '../hooks/use_flyout_focus_management';
import { SignificantEventDetailBody } from './significant_event_detail_body';
import { SignificantEventDetailHeader } from './significant_event_detail_header';
import {
  capitalize,
  getRecommendedActionBadgeColor,
  getRecommendedActionIcon,
  getSeverityFromScore,
  adaptEventDocumentToDetailFields,
} from './event_utils';

const formatDetectedAt = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return i18n.translate('xpack.nightshift.lowerPriorityEvents.detectedAtLabel', {
    defaultMessage: 'Detected on {date}',
    values: {
      date: date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  });
};

export interface LowerPriorityEventsProps {
  events: EventDocument[];
  onRemediate?: (eventTitle: string, eventId: string) => void;
  selectedEventId?: string | null;
  onSelectedEventChange?: (eventId: string | null) => void;
}

export function LowerPriorityEvents({
  events,
  onRemediate,
  selectedEventId: controlledEventId,
  onSelectedEventChange,
}: LowerPriorityEventsProps) {
  const { euiTheme } = useEuiTheme();
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana<{ http: { basePath: { prepend: (path: string) => string } } }>().services;
  const [internalEventId, setInternalEventId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof EventDocument>('criticality');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const flyoutHeadingId = useGeneratedHtmlId({ prefix: 'eventDetailFlyout' });

  const isControlled = controlledEventId !== undefined;
  const activeEventId = isControlled ? controlledEventId : internalEventId;
  const selectedEvent = events.find((e) => e.event_id === activeEventId) ?? null;

  const setActiveEventId = useCallback(
    (eventId: string | null) => {
      if (onSelectedEventChange) {
        onSelectedEventChange(eventId);
      }
      if (!isControlled) {
        setInternalEventId(eventId);
      }
    },
    [onSelectedEventChange, isControlled]
  );

  const closeFlyout = useCallback(() => {
    setActiveEventId(null);
  }, [setActiveEventId]);

  const { open: openFlyout } = useFlyoutFocusManagement({
    isOpen: !!selectedEvent,
    onClose: closeFlyout,
    flyoutTestSubj: 'eventDetailFlyout',
  });

  const toggleEvent = useCallback(
    (item: EventDocument) => {
      if (activeEventId === item.event_id) {
        closeFlyout();
      } else {
        openFlyout();
        setActiveEventId(item.event_id);
      }
    },
    [activeEventId, closeFlyout, openFlyout, setActiveEventId]
  );

  const onTableChange = useCallback(({ sort }: Criteria<EventDocument>) => {
    if (sort) {
      setSortField(sort.field);
      setSortDirection(sort.direction);
    }
  }, []);

  const sortedEvents = [...events]
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const direction = sortDirection === 'asc' ? 1 : -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * direction;
      }
      return String(aVal).localeCompare(String(bVal)) * direction;
    })
    .slice(0, 5);

  const columns: Array<EuiBasicTableColumn<EventDocument>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.nightshift.lowerPriorityEvents.titleColumn', {
        defaultMessage: 'Event',
      }),
      sortable: true,
      truncateText: true,
      render: (title: string, item: EventDocument) => {
        const isExpanded = selectedEvent?.event_id === item.event_id;
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj={`eventExpandRow-${item.event_id}`}
                iconType={isExpanded ? 'minimize' : 'expand'}
                onClick={() => toggleEvent(item)}
                aria-label={
                  isExpanded
                    ? i18n.translate('xpack.nightshift.lowerPriorityEvents.minimizeDetailsAria', {
                        defaultMessage: 'Minimize details',
                      })
                    : i18n.translate('xpack.nightshift.lowerPriorityEvents.viewDetailsAria', {
                        defaultMessage: 'View details',
                      })
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink data-test-subj="o11yColumnsLink" onClick={() => toggleEvent(item)}>
                {title}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'criticality',
      name: i18n.translate('xpack.nightshift.lowerPriorityEvents.severityColumn', {
        defaultMessage: 'Severity',
      }),
      sortable: true,
      width: '100px',
      render: (criticality: number) => {
        const sev = getSeverityFromScore(criticality);
        return <EuiBadge color={sev.badgeColor}>{sev.label}</EuiBadge>;
      },
    },
    {
      field: 'criticality',
      name: i18n.translate('xpack.nightshift.lowerPriorityEvents.scoreColumn', {
        defaultMessage: 'Score',
      }),
      sortable: true,
      width: '80px',
      render: (criticality: number) => <EuiText size="s">{criticality}</EuiText>,
    },
    {
      field: 'recommended_action',
      name: i18n.translate('xpack.nightshift.lowerPriorityEvents.actionColumn', {
        defaultMessage: 'Action',
      }),
      sortable: true,
      width: '120px',
      render: (action: EventDocument['recommended_action'], item: EventDocument) => (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge
              color={getRecommendedActionBadgeColor(action)}
              iconType={getRecommendedActionIcon(action)}
            >
              {capitalize(action)}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj={`eventAttach-${item.event_id}`}
              iconType="paperClip"
              display="empty"
              size="xs"
              color="text"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                onRemediate?.(item.title, item.event_id);
              }}
              aria-label={i18n.translate('xpack.nightshift.lowerPriorityEvents.attachActionAria', {
                defaultMessage: 'Attach context for {title}',
                values: { title: item.title },
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  if (events.length === 0) {
    return null;
  }

  return (
    <>
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="m"
        data-test-subj="sigeventsLowerPriorityEvents"
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.nightshift.lowerPriorityEvents.title', {
                  defaultMessage: 'Lower priority items to review',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="crosshairs"
              iconSide="left"
              flush="right"
              href={prepend('/app/streams/_discovery/knowledge_indicators')}
              data-test-subj="sigeventsViewAllKnowledgeIndicators"
            >
              {i18n.translate('xpack.nightshift.lowerPriorityEvents.goToSignificantEvents', {
                defaultMessage: 'Go to Significant events',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.nightshift.lowerPriorityEvents.description', {
            defaultMessage:
              'These significant events were assessed and demoted from critical status. Click to see details.',
          })}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiBasicTable<EventDocument>
          itemId="event_id"
          items={sortedEvents}
          columns={columns}
          sorting={{
            sort: {
              field: sortField,
              direction: sortDirection,
            },
          }}
          onChange={onTableChange}
          rowProps={(item) => {
            const isExpanded = selectedEvent?.event_id === item.event_id;
            return {
              style: {
                background: isExpanded ? euiTheme.colors.backgroundBaseSubdued : undefined,
              },
              'data-test-subj': isExpanded
                ? `eventRow-${item.event_id}-expanded`
                : `eventRow-${item.event_id}`,
            };
          }}
          tableLayout="fixed"
        />
      </EuiPanel>

      {selectedEvent && (
        <EventDetailFlyout
          event={selectedEvent}
          flyoutHeadingId={flyoutHeadingId}
          onClose={closeFlyout}
          onRemediate={onRemediate}
        />
      )}
    </>
  );
}

interface EventDetailFlyoutProps {
  event: EventDocument;
  flyoutHeadingId: string;
  onClose: () => void;
  onRemediate?: (eventTitle: string, eventId: string) => void;
}

function EventDetailFlyout({
  event,
  flyoutHeadingId,
  onClose,
  onRemediate,
}: EventDetailFlyoutProps) {
  const detailFields = adaptEventDocumentToDetailFields(event);
  const detectedAtLabel = formatDetectedAt(event['@timestamp']);

  const handleRemediate = useCallback(() => {
    if (onRemediate) {
      onRemediate(event.title, event.event_id);
    }
  }, [onRemediate, event.title, event.event_id]);

  return (
    <EuiFlyout
      type="push"
      side="right"
      size="m"
      onClose={onClose}
      ownFocus={false}
      pushMinBreakpoint="s"
      paddingSize="m"
      aria-labelledby={flyoutHeadingId}
      data-test-subj="eventDetailFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <div id={flyoutHeadingId}>
          <SignificantEventDetailHeader
            title={event.title}
            detectedAtLabel={detectedAtLabel}
            severityScore={event.criticality}
          />
        </div>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SignificantEventDetailBody
          event={detailFields}
          hideHeader
          onRemediate={onRemediate ? handleRemediate : undefined}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
