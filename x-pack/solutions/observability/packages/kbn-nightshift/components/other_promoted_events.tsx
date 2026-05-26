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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiPanel,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LatestSignificantEventData } from '../hooks/use_fetch_latest_significant_event';
import { useFlyoutFocusManagement } from '../hooks/use_flyout_focus_management';
import { SignificantEventDetailBody } from './significant_event_detail_body';
import { SignificantEventDetailHeader } from './significant_event_detail_header';
import {
  capitalize,
  getRecommendedActionBadgeColor,
  getRecommendedActionIcon,
  getSeverityFromScore,
} from './event_utils';

type RecommendedAction = LatestSignificantEventData['raw']['recommended_action'];

export interface OtherPromotedEventsProps {
  events: LatestSignificantEventData[];
  onRemediate?: (eventTitle: string, eventId: string) => void;
  selectedEventId?: string | null;
  onSelectedEventChange?: (eventId: string | null) => void;
}

interface OtherPromotedEventRow {
  id: string;
  title: string;
  severity: string;
  action: string;
  severityColor: LatestSignificantEventData['severityColor'];
  recommendedAction: RecommendedAction;
  source: LatestSignificantEventData;
}

type SortableField = 'title' | 'severity' | 'action';

const SEVERITY_PRIORITY: Record<LatestSignificantEventData['severityColor'], number> = {
  danger: 0,
  warning: 1,
  primary: 2,
  subdued: 3,
};

export function OtherPromotedEvents({
  events,
  onRemediate,
  selectedEventId: controlledEventId,
  onSelectedEventChange,
}: OtherPromotedEventsProps) {
  const { euiTheme } = useEuiTheme();
  const [internalEventId, setInternalEventId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortableField>('severity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const flyoutHeadingId = useGeneratedHtmlId({ prefix: 'otherPromotedEventFlyout' });

  const isControlled = controlledEventId !== undefined;
  const activeEventId = isControlled ? controlledEventId : internalEventId;
  const selectedEvent = events.find((e) => e.raw.event_id === activeEventId) ?? null;

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
    flyoutTestSubj: 'otherPromotedEventDetailFlyout',
  });

  const toggleEvent = useCallback(
    (item: LatestSignificantEventData) => {
      if (activeEventId === item.raw.event_id) {
        closeFlyout();
      } else {
        openFlyout();
        setActiveEventId(item.raw.event_id);
      }
    },
    [activeEventId, closeFlyout, openFlyout, setActiveEventId]
  );

  const onTableChange = useCallback(({ sort }: Criteria<OtherPromotedEventRow>) => {
    if (sort) {
      setSortField(sort.field as SortableField);
      setSortDirection(sort.direction);
    }
  }, []);

  if (events.length === 0) {
    return null;
  }

  const rows: OtherPromotedEventRow[] = events.map((event) => ({
    id: event.raw.event_id,
    title: event.mainEventTitle,
    severity: event.severityLabel,
    action: capitalize(event.raw.recommended_action),
    severityColor: event.severityColor,
    recommendedAction: event.raw.recommended_action,
    source: event,
  }));

  const sortedRows = [...rows].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    if (sortField === 'severity') {
      return (
        ((SEVERITY_PRIORITY[a.severityColor] ?? 99) - (SEVERITY_PRIORITY[b.severityColor] ?? 99)) *
        direction
      );
    }
    if (sortField === 'action') {
      return a.action.localeCompare(b.action) * direction;
    }
    return a.title.localeCompare(b.title) * direction;
  });

  const columns: Array<EuiBasicTableColumn<OtherPromotedEventRow>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.nightshift.otherPromotedEvents.titleColumn', {
        defaultMessage: 'Event',
      }),
      sortable: true,
      truncateText: true,
      render: (title: string, item: OtherPromotedEventRow) => {
        const isExpanded = selectedEvent?.raw.event_id === item.id;
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj={`otherPromotedEventExpandRow-${item.id}`}
                iconType={isExpanded ? 'minimize' : 'expand'}
                onClick={() => toggleEvent(item.source)}
                aria-label={
                  isExpanded
                    ? i18n.translate('xpack.nightshift.otherPromotedEvents.minimizeDetailsAria', {
                        defaultMessage: 'Minimize details',
                      })
                    : i18n.translate('xpack.nightshift.otherPromotedEvents.viewDetailsAria', {
                        defaultMessage: 'View details',
                      })
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink
                data-test-subj={`otherPromotedEventTitleLink-${item.id}`}
                onClick={() => toggleEvent(item.source)}
              >
                {title}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'severity',
      name: i18n.translate('xpack.nightshift.otherPromotedEvents.severityColumn', {
        defaultMessage: 'Severity',
      }),
      sortable: true,
      width: '110px',
      render: (_value: unknown, item: OtherPromotedEventRow) => {
        const sev = getSeverityFromScore(item.source.blastRadiusScore);
        return <EuiBadge color={sev.badgeColor}>{sev.label}</EuiBadge>;
      },
    },
    {
      field: 'action',
      name: i18n.translate('xpack.nightshift.otherPromotedEvents.actionColumn', {
        defaultMessage: 'Action',
      }),
      sortable: true,
      width: '130px',
      render: (_value: unknown, item: OtherPromotedEventRow) => (
        <EuiBadge
          color={getRecommendedActionBadgeColor(item.recommendedAction)}
          iconType={getRecommendedActionIcon(item.recommendedAction)}
        >
          {item.action}
        </EuiBadge>
      ),
    },
  ];

  return (
    <>
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="m"
        data-test-subj="sigeventsOverviewOtherPromotedEvents"
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.nightshift.sigeventsOverview.otherPromotedEvents.title', {
                  defaultMessage: 'Additional significant events that were promoted',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiBasicTable<OtherPromotedEventRow>
          itemId="id"
          items={sortedRows}
          columns={columns}
          sorting={{
            sort: {
              field: sortField,
              direction: sortDirection,
            },
          }}
          onChange={onTableChange}
          rowProps={(item) => {
            const isExpanded = selectedEvent?.raw.event_id === item.id;
            return {
              style: {
                background: isExpanded ? euiTheme.colors.backgroundBaseSubdued : undefined,
              },
              'data-test-subj': isExpanded
                ? `otherPromotedEventRow-${item.id}-expanded`
                : `otherPromotedEventRow-${item.id}`,
            };
          }}
          tableLayout="fixed"
        />
      </EuiPanel>

      {selectedEvent ? (
        <OtherPromotedEventFlyout
          event={selectedEvent}
          flyoutHeadingId={flyoutHeadingId}
          onClose={closeFlyout}
          onRemediate={onRemediate}
        />
      ) : null}
    </>
  );
}

interface OtherPromotedEventFlyoutProps {
  event: LatestSignificantEventData;
  flyoutHeadingId: string;
  onClose: () => void;
  onRemediate?: (eventTitle: string, eventId: string) => void;
}

function OtherPromotedEventFlyout({
  event,
  flyoutHeadingId,
  onClose,
  onRemediate,
}: OtherPromotedEventFlyoutProps) {
  const handleRemediate = useCallback(() => {
    if (onRemediate) {
      onRemediate(event.mainEventTitle, event.raw.event_id);
      onClose();
    }
  }, [onRemediate, onClose, event.mainEventTitle, event.raw.event_id]);

  return (
    <EuiFlyout
      type="push"
      side="right"
      size={620}
      onClose={onClose}
      ownFocus={false}
      pushMinBreakpoint="s"
      paddingSize="m"
      aria-labelledby={flyoutHeadingId}
      data-test-subj="otherPromotedEventDetailFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <div id={flyoutHeadingId}>
          <SignificantEventDetailHeader
            title={event.detailFields.label || event.mainEventTitle}
            severityScore={event.blastRadiusScore}
          />
        </div>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SignificantEventDetailBody
          event={event.detailFields}
          hideHeader
          onRemediate={onRemediate ? handleRemediate : undefined}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
