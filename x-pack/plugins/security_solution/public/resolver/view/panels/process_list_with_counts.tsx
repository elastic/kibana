/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

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
import { formatter, StyledBreadcrumbs } from './panel_content_utilities';
import { useResolverDispatch } from '../use_resolver_dispatch';
import { SideEffectContext } from '../side_effect_context';
import { CubeForProcess } from './cube_for_process';
import { SafeResolverEvent } from '../../../../common/endpoint/types';
import { LimitWarning } from '../limit_warnings';
import { useReplaceBreadcrumbParameters } from '../use_replace_breadcrumb_parameters';

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
 */
export const ProcessListWithCounts = memo(() => {
  interface ProcessTableView {
    name?: string;
    timestamp?: Date;
    event: SafeResolverEvent;
  }

  const dispatch = useResolverDispatch();
  const { timestamp } = useContext(SideEffectContext);
  const isProcessTerminated = useSelector(selectors.isProcessTerminated);
  const pushToQueryParams = useReplaceBreadcrumbParameters();
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
          const entityID = event.entityIDSafeVersion(item.event);
          const isTerminated = entityID === undefined ? false : isProcessTerminated(entityID);
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
                pushToQueryParams({
                  // Take the user back to the list of nodes if this node has no ID
                  crumbId: event.entityIDSafeVersion(item.event) ?? '',
                  crumbEvent: '',
                });
              }}
            >
              <CubeForProcess
                running={!isTerminated}
                data-test-subj="resolver:node-list:node-link:icon"
              />
              <span data-test-subj="resolver:node-list:node-link:title">{name}</span>
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
    [pushToQueryParams, handleBringIntoViewClick, isProcessTerminated]
  );

  const { processNodePositions } = useSelector(selectors.layout);
  const processTableView: ProcessTableView[] = useMemo(
    () =>
      [...processNodePositions.keys()].map((processEvent) => {
        const name = event.processNameSafeVersion(processEvent);
        return {
          name,
          timestamp: event.timestampAsDateSafeVersion(processEvent),
          event: processEvent,
        };
      }),
    [processNodePositions]
  );
  const numberOfProcesses = processTableView.length;

  const crumbs = useMemo(() => {
    return [
      {
        text: i18n.translate('xpack.securitySolution.resolver.panel.nodeList.title', {
          defaultMessage: 'All Process Events',
        }),
        onClick: () => {},
      },
    ];
  }, []);

  const children = useSelector(selectors.hasMoreChildren);
  const ancestors = useSelector(selectors.hasMoreAncestors);
  const showWarning = children === true || ancestors === true;
  const rowProps = useMemo(() => ({ 'data-test-subj': 'resolver:node-list:item' }), []);
  return (
    <>
      <StyledBreadcrumbs breadcrumbs={crumbs} />
      {showWarning && <StyledLimitWarning numberDisplayed={numberOfProcesses} />}
      <EuiSpacer size="l" />
      <EuiInMemoryTable<ProcessTableView>
        rowProps={rowProps}
        data-test-subj="resolver:node-list"
        items={processTableView}
        columns={columns}
        sorting
      />
    </>
  );
});
