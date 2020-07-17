/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useContext, useCallback, useMemo } from 'react';
import {
  EuiBasicTableColumn,
  EuiBadge,
  EuiButtonEmpty,
  EuiSpacer,
  EuiInMemoryTable,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import * as event from '../../../../common/endpoint/models/event';
import * as selectors from '../../store/selectors';
import { CrumbInfo, formatter, StyledBreadcrumbs } from './panel_content_utilities';
import { useResolverDispatch } from '../use_resolver_dispatch';
import { SideEffectContext } from '../side_effect_context';
import { CubeForProcess } from './process_cube_icon';
import { ResolverEvent } from '../../../../common/endpoint/types';
import { LimitWarning } from '../limit_warnings';

const StyledLimitWarning = styled(LimitWarning)`
  flex-flow: row wrap;
  display: block;
  align-items: baseline;
  margin-top: 1em;

  & .euiCallOutHeader {
    display: inline;
    margin-right: 0.25em;
  }

  & .euiText {
    display: inline;
  }

  & .euiText p {
    display: inline;
  }
`;

/**
 * The "default" view for the panel: A list of all the processes currently in the graph.
 *
 * @param {function} pushToQueryparams A function to update the hash value in the URL to control panel state
 */
export const ProcessListWithCounts = memo(function ProcessListWithCounts({
  pushToQueryParams,
  isProcessTerminated,
  isProcessOrigin,
}: {
  pushToQueryParams: (queryStringKeyValuePair: CrumbInfo) => unknown;
  isProcessTerminated: boolean;
  isProcessOrigin: boolean;
}) {
  interface ProcessTableView {
    name: string;
    timestamp?: Date;
    event: ResolverEvent;
  }

  const dispatch = useResolverDispatch();
  const { timestamp } = useContext(SideEffectContext);
  const handleBringIntoViewClick = useCallback(
    (processTableViewItem) => {
      dispatch({
        type: 'userBroughtProcessIntoView',
        payload: {
          time: timestamp(),
          process: processTableViewItem.event,
        },
      });
      pushToQueryParams({ crumbId: event.entityId(processTableViewItem.event), crumbEvent: '' });
    },
    [dispatch, timestamp, pushToQueryParams]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<ProcessTableView>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate(
          'xpack.securitySolution.endpoint.resolver.panel.table.row.processNameTitle',
          {
            defaultMessage: 'Process Name',
          }
        ),
        sortable: true,
        truncateText: true,
        render(name: string, item: ProcessTableView) {
          return name === '' ? (
            <EuiBadge color="warning">
              {i18n.translate(
                'xpack.securitySolution.endpoint.resolver.panel.table.row.valueMissingDescription',
                {
                  defaultMessage: 'Value is missing',
                }
              )}
            </EuiBadge>
          ) : (
            <EuiButtonEmpty
              onClick={() => {
                handleBringIntoViewClick(item);
                pushToQueryParams({ crumbId: event.entityId(item.event), crumbEvent: '' });
              }}
            >
              <CubeForProcess
                isProcessTerminated={isProcessTerminated}
                isProcessOrigin={isProcessOrigin}
              />
              {name}
            </EuiButtonEmpty>
          );
        },
      },
      {
        field: 'timestamp',
        name: i18n.translate(
          'xpack.securitySolution.endpoint.resolver.panel.table.row.timestampTitle',
          {
            defaultMessage: 'Timestamp',
          }
        ),
        dataType: 'date',
        sortable: true,
        render(eventDate?: Date) {
          return eventDate ? (
            formatter.format(eventDate)
          ) : (
            <EuiBadge color="warning">
              {i18n.translate(
                'xpack.securitySolution.endpoint.resolver.panel.table.row.timestampInvalidLabel',
                {
                  defaultMessage: 'invalid',
                }
              )}
            </EuiBadge>
          );
        },
      },
    ],
    [pushToQueryParams, handleBringIntoViewClick, isProcessOrigin, isProcessTerminated]
  );

  const { processNodePositions } = useSelector(selectors.layout);
  const processTableView: ProcessTableView[] = useMemo(
    () =>
      [...processNodePositions.keys()].map((processEvent) => {
        let dateTime;
        const eventTime = event.eventTimestamp(processEvent);
        const name = event.eventName(processEvent);
        if (eventTime) {
          const date = new Date(eventTime);
          if (isFinite(date.getTime())) {
            dateTime = date;
          }
        }
        return {
          name,
          timestamp: dateTime,
          event: processEvent,
        };
      }),
    [processNodePositions]
  );
  const numberOfProcesses = processTableView.length;

  const crumbs = useMemo(() => {
    return [
      {
        text: i18n.translate(
          'xpack.securitySolution.endpoint.resolver.panel.processListWithCounts.events',
          {
            defaultMessage: 'All Process Events',
          }
        ),
        onClick: () => {},
      },
    ];
  }, []);

  const children = useSelector(selectors.hasMoreChildren);
  const ancestors = useSelector(selectors.hasMoreAncestors);
  const showWarning = children === true || ancestors === true;
  return (
    <>
      <StyledBreadcrumbs breadcrumbs={crumbs} />
      {showWarning && <StyledLimitWarning numberDisplayed={numberOfProcesses} />}
      <EuiSpacer size="l" />
      <EuiInMemoryTable<ProcessTableView> items={processTableView} columns={columns} sorting />
    </>
  );
});
ProcessListWithCounts.displayName = 'ProcessListWithCounts';
