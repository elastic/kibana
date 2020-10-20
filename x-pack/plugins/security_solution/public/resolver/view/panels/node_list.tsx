/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

/* eslint-disable no-duplicate-imports */

import { useDispatch } from 'react-redux';

/* eslint-disable react/display-name */

import React, { memo, useMemo, useCallback, useContext } from 'react';
import {
  EuiBasicTableColumn,
  EuiBadge,
  EuiButtonEmpty,
  EuiSpacer,
  EuiInMemoryTable,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux';
import { SideEffectContext } from '../side_effect_context';
import { StyledPanel } from '../styles';
import {
  StyledLabelTitle,
  StyledAnalyzedEvent,
  StyledLabelContainer,
  StyledButtonTextContainer,
} from './styles';
import * as eventModel from '../../../../common/endpoint/models/event';
import * as selectors from '../../store/selectors';
import { Breadcrumbs } from './breadcrumbs';
import { CubeForProcess } from './cube_for_process';
import { LimitWarning } from '../limit_warnings';
import { ResolverState } from '../../types';
import { useLinkProps } from '../use_link_props';
import { useColors } from '../use_colors';
import { SafeResolverEvent } from '../../../../common/endpoint/types';
import { ResolverAction } from '../../store/actions';
import { useFormattedDate } from './use_formatted_date';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { CopyablePanelField } from './copyable_panel_field';

interface ProcessTableView {
  name?: string;
  timestamp?: Date;
  nodeID: string;
  event: SafeResolverEvent;
}

/**
 * The "default" view for the panel: A list of all the processes currently in the graph.
 */
export const NodeList = memo(() => {
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
        render(name: string | undefined, item: ProcessTableView) {
          return <NodeDetailLink name={name} event={item.event} nodeID={item.nodeID} />;
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
          return <NodeDetailTimestamp eventDate={eventDate} />;
        },
      },
    ],
    []
  );

  const processTableView: ProcessTableView[] = useSelector(
    useCallback((state: ResolverState) => {
      const { processNodePositions } = selectors.layout(state);
      const view: ProcessTableView[] = [];
      for (const processEvent of processNodePositions.keys()) {
        const name = eventModel.processNameSafeVersion(processEvent);
        const nodeID = eventModel.entityIDSafeVersion(processEvent);
        if (nodeID !== undefined) {
          view.push({
            name,
            timestamp: eventModel.timestampAsDateSafeVersion(processEvent),
            nodeID,
            event: processEvent,
          });
        }
      }
      return view;
    }, [])
  );

  const numberOfProcesses = processTableView.length;

  const crumbs = useMemo(() => {
    return [
      {
        text: i18n.translate('xpack.securitySolution.resolver.panel.nodeList.title', {
          defaultMessage: 'All Process Events',
        }),
      },
    ];
  }, []);

  const children = useSelector(selectors.hasMoreChildren);
  const ancestors = useSelector(selectors.hasMoreAncestors);
  const showWarning = children === true || ancestors === true;
  const rowProps = useMemo(() => ({ 'data-test-subj': 'resolver:node-list:item' }), []);
  return (
    <StyledPanel>
      <Breadcrumbs breadcrumbs={crumbs} />
      {showWarning && <LimitWarning numberDisplayed={numberOfProcesses} />}
      <EuiSpacer size="l" />
      <EuiInMemoryTable<ProcessTableView>
        rowProps={rowProps}
        data-test-subj="resolver:node-list"
        items={processTableView}
        columns={columns}
        sorting
      />
    </StyledPanel>
  );
});

function NodeDetailLink({
  name,
  nodeID,
  event,
}: {
  name?: string;
  nodeID: string;
  event: SafeResolverEvent;
}) {
  const isOrigin = useSelector((state: ResolverState) => {
    return selectors.originID(state) === nodeID;
  });
  const isTerminated = useSelector((state: ResolverState) =>
    nodeID === undefined ? false : selectors.isProcessTerminated(state)(nodeID)
  );
  const { descriptionText } = useColors();
  const linkProps = useLinkProps({ panelView: 'nodeDetail', panelParameters: { nodeID } });
  const dispatch: (action: ResolverAction) => void = useDispatch();
  const { timestamp } = useContext(SideEffectContext);
  const handleOnClick = useCallback(
    (mouseEvent: React.MouseEvent<HTMLAnchorElement>) => {
      linkProps.onClick(mouseEvent);
      dispatch({
        type: 'userBroughtNodeIntoView',
        payload: {
          nodeID,
          time: timestamp(),
        },
      });
    },
    [timestamp, linkProps, dispatch, nodeID]
  );
  return (
    <EuiButtonEmpty onClick={handleOnClick} href={linkProps.href}>
      {name === '' ? (
        <EuiBadge color="warning">
          {i18n.translate(
            'xpack.securitySolution.endpoint.resolver.panel.table.row.valueMissingDescription',
            {
              defaultMessage: 'Value is missing',
            }
          )}
        </EuiBadge>
      ) : (
        <StyledButtonTextContainer>
          <CubeForProcess
            running={!isTerminated}
            isOrigin={isOrigin}
            data-test-subj="resolver:node-list:node-link:icon"
          />
          <StyledLabelContainer>
            {isOrigin && (
              <StyledAnalyzedEvent
                color={descriptionText}
                data-test-subj="resolver:node-list:node-link:analyzed-event"
              >
                {i18n.translate('xpack.securitySolution.resolver.panel.table.row.analyzedEvent', {
                  defaultMessage: 'ANALYZED EVENT',
                })}
              </StyledAnalyzedEvent>
            )}
            <StyledLabelTitle data-test-subj="resolver:node-list:node-link:title">
              {name}
            </StyledLabelTitle>
          </StyledLabelContainer>
        </StyledButtonTextContainer>
      )}
    </EuiButtonEmpty>
  );
}

const NodeDetailTimestamp = memo(({ eventDate }: { eventDate: Date | undefined }) => {
  const formattedDate = useFormattedDate(eventDate);

  return formattedDate ? (
    <CopyablePanelField textToCopy={formattedDate} content={formattedDate} />
  ) : (
    getEmptyTagValue()
  );
});
