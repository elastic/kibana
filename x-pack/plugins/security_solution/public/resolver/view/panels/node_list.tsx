/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import { useDispatch, useSelector } from 'react-redux';
import React, { memo, useMemo, useCallback, useContext } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBadge, EuiButtonEmpty, EuiSpacer, EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SideEffectContext } from '../side_effect_context';
import { StyledPanel } from '../styles';
import {
  StyledLabelTitle,
  StyledAnalyzedEvent,
  StyledLabelContainer,
  StyledButtonTextContainer,
} from './styles';
import * as nodeModel from '../../../../common/endpoint/models/node';
import * as selectors from '../../store/selectors';
import { Breadcrumbs } from './breadcrumbs';
import { CubeForProcess } from './cube_for_process';
import { LimitWarning } from '../limit_warnings';
import { useLinkProps } from '../use_link_props';
import { useColors } from '../use_colors';
import { useFormattedDate } from './use_formatted_date';
import { CopyablePanelField } from './copyable_panel_field';
import { userSelectedResolverNode } from '../../store/actions';
import type { State } from '../../../common/store/types';

interface ProcessTableView {
  name?: string;
  timestamp?: Date;
  nodeID: string;
}

/**
 * The "default" view for the panel: A list of all the processes currently in the graph.
 */
// eslint-disable-next-line react/display-name
export const NodeList = memo(({ id }: { id: string }) => {
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
          return <NodeDetailLink id={id} name={name} nodeID={item.nodeID} />;
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
    [id]
  );

  const processTableView: ProcessTableView[] = useSelector(
    useCallback(
      (state: State) => {
        const { processNodePositions } = selectors.layout(state.analyzer[id]);
        const view: ProcessTableView[] = [];
        for (const treeNode of processNodePositions.keys()) {
          const name = nodeModel.nodeName(treeNode);
          const nodeID = nodeModel.nodeID(treeNode);
          if (nodeID !== undefined) {
            view.push({
              name,
              timestamp: nodeModel.timestampAsDate(treeNode),
              nodeID,
            });
          }
        }
        return view;
      },
      [id]
    )
  );

  const numberOfProcesses = processTableView.length;

  const breadcrumbs = useMemo(() => {
    return [
      {
        text: i18n.translate('xpack.securitySolution.resolver.panel.nodeList.title', {
          defaultMessage: 'All Process Events',
        }),
      },
    ];
  }, []);

  const children = useSelector((state: State) => selectors.hasMoreChildren(state.analyzer[id]));
  const ancestors = useSelector((state: State) => selectors.hasMoreAncestors(state.analyzer[id]));
  const generations = useSelector((state: State) =>
    selectors.hasMoreGenerations(state.analyzer[id])
  );
  const showWarning = children === true || ancestors === true || generations === true;
  const rowProps = useMemo(() => ({ 'data-test-subj': 'resolver:node-list:item' }), []);
  return (
    <StyledPanel hasBorder>
      <Breadcrumbs breadcrumbs={breadcrumbs} />
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

function NodeDetailLink({ id, name, nodeID }: { id: string; name?: string; nodeID: string }) {
  const isOrigin = useSelector((state: State) => {
    return selectors.originID(state.analyzer[id]) === nodeID;
  });
  const nodeState = useSelector((state: State) =>
    selectors.nodeDataStatus(state.analyzer[id])(nodeID)
  );
  const { descriptionText } = useColors();
  const linkProps = useLinkProps(id, { panelView: 'nodeDetail', panelParameters: { nodeID } });
  const dispatch = useDispatch();
  const { timestamp } = useContext(SideEffectContext);
  const handleOnClick = useCallback(
    (mouseEvent: React.MouseEvent<HTMLAnchorElement>) => {
      linkProps.onClick(mouseEvent);
      dispatch(
        userSelectedResolverNode({
          id,
          nodeID,
          time: timestamp(),
        })
      );
    },
    [timestamp, linkProps, dispatch, nodeID, id]
  );
  return (
    <EuiButtonEmpty
      onClick={handleOnClick}
      href={linkProps.href}
      data-test-subj="resolver:node-list:node-link"
      data-test-node-id={nodeID}
    >
      {name === undefined ? (
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
            id={id}
            state={nodeState}
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

// eslint-disable-next-line react/display-name
const NodeDetailTimestamp = memo(({ eventDate }: { eventDate: Date | undefined }) => {
  const formattedDate = useFormattedDate(eventDate);

  return formattedDate ? (
    <CopyablePanelField textToCopy={formattedDate} content={formattedDate} />
  ) : (
    <span>{'—'}</span>
  );
});
