/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React, { memo, useMemo } from 'react';
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
import { StyledPanel } from '../styles';
import * as event from '../../../../common/endpoint/models/event';
import * as selectors from '../../store/selectors';
import { formatter, StyledBreadcrumbs } from './panel_content_utilities';
import { CubeForProcess } from './cube_for_process';
import { SafeResolverEvent } from '../../../../common/endpoint/types';
import { LimitWarning } from '../limit_warnings';
import { ResolverState } from '../../types';
import { useNavigateOrReplace } from '../use_navigate_or_replace';

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
interface ProcessTableView {
  name?: string;
  timestamp?: Date;
  event: SafeResolverEvent;
  href: string | undefined;
}

const StyledProcessLabelWrapper = styled.div`
  display: inline-block;
  width: 80%;
  vertical-align: super;
`;

const StyledProcessLabel = styled.div`
  display: flex;
  flex-direction: column;
  text-align: left;

  & .origin-label {
    color: #343741;
    font-size: 10.5px;
    font-weight: 700;
  }

  & div {
    max-width: 100%;
    display: flex;

    & span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
`;

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
        render(name: string, item: ProcessTableView) {
          return <NodeDetailLink name={name} item={item} />;
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
    []
  );

  const { processNodePositions } = useSelector(selectors.layout);
  const nodeHrefs: Map<SafeResolverEvent, string | null | undefined> = useSelector(
    (state: ResolverState) => {
      const relativeHref = selectors.relativeHref(state);
      return new Map(
        [...processNodePositions.keys()].map((processEvent) => {
          const nodeID = event.entityIDSafeVersion(processEvent);
          if (nodeID === undefined) {
            return [processEvent, null];
          }
          return [
            processEvent,
            relativeHref({
              panelView: 'nodeDetail',
              panelParameters: {
                nodeID,
              },
            }),
          ];
        })
      );
    }
  );
  const processTableView: ProcessTableView[] = useMemo(
    () =>
      [...processNodePositions.keys()].map((processEvent) => {
        const name = event.processNameSafeVersion(processEvent);
        return {
          name,
          timestamp: event.timestampAsDateSafeVersion(processEvent),
          event: processEvent,
          href: nodeHrefs.get(processEvent) ?? undefined,
        };
      }),
    [processNodePositions, nodeHrefs]
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
    <StyledPanel>
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
    </StyledPanel>
  );
});

function NodeDetailLink({ name, item }: { name: string; item: ProcessTableView }) {
  const entityID = event.entityIDSafeVersion(item.event);
  const originID = useSelector(selectors.originID);
  const isOrigin = originID === entityID;
  const isTerminated = useSelector((state: ResolverState) =>
    entityID === undefined ? false : selectors.isProcessTerminated(state)(entityID)
  );
  return (
    <EuiButtonEmpty {...useNavigateOrReplace({ search: item.href })}>
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
        <>
          <CubeForProcess
            running={!isTerminated}
            isOrigin={isOrigin}
            data-test-subj="resolver:node-list:node-link:icon"
          />
          {isOrigin ? (
            <StyledProcessLabelWrapper>
              <StyledProcessLabel>
                <div data-test-subj="resolver:node-list:node-link:origin" className="origin-label">
                  <span>
                    {i18n.translate(
                      'xpack.securitySolution.endpoint.resolver.panel.table.row.originLabel',
                      {
                        defaultMessage: 'Analyzed Event',
                      }
                    )}
                  </span>
                </div>
                <div data-test-subj="resolver:node-list:node-link:title">
                  <span>{name}</span>
                </div>
              </StyledProcessLabel>
            </StyledProcessLabelWrapper>
          ) : (
            <span data-test-subj="resolver:node-list:node-link:title">{name}</span>
          )}
        </>
      )}
    </EuiButtonEmpty>
  );
}
