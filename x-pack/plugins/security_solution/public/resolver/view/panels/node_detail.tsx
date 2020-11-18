/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React, { memo, useMemo, HTMLAttributes } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { htmlIdGenerator, EuiSpacer, EuiTitle, EuiText, EuiTextColor, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';
import { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import { StyledDescriptionList, StyledTitle } from './styles';
import * as selectors from '../../store/selectors';
import * as eventModel from '../../../../common/endpoint/models/event';
import { GeneratedText } from '../generated_text';
import { CopyablePanelField } from './copyable_panel_field';
import { Breadcrumbs } from './breadcrumbs';
import { processPath, processPID } from '../../models/process_event';
import { CubeForProcess } from './cube_for_process';
import { ResolverNode, SafeResolverEvent } from '../../../../common/endpoint/types';
import { useCubeAssets } from '../use_cube_assets';
import { ResolverState } from '../../types';
import { PanelLoading } from './panel_loading';
import { StyledPanel } from '../styles';
import { useLinkProps } from '../use_link_props';
import { useFormattedDate } from './use_formatted_date';

// TODO: THIS DOES NOT CURRENTLY WORK. NEED to update this once we have the events data.
const StyledCubeForProcess = styled(CubeForProcess)`
  position: relative;
  top: 0.75em;
`;

export const NodeDetail = memo(function ({ nodeID }: { nodeID: string }) {
  const graphNode = useSelector((state: ResolverState) => selectors.graphNodeForId(state)(nodeID));
  return (
    <>
      {graphNode === null ? (
        <StyledPanel>
          <PanelLoading />
        </StyledPanel>
      ) : (
        <StyledPanel data-test-subj="resolver:panel:node-detail">
          <NodeDetailView nodeID={nodeID} graphNode={graphNode} />
        </StyledPanel>
      )}
    </>
  );
});

/**
 * A description list view of all the Metadata that goes with a particular process event, like:
 * Created, PID, User/Domain, etc.
 */
const NodeDetailView = memo(function ({
  graphNode,
  nodeID,
}: {
  graphNode: ResolverNode;
  nodeID: string;
}) {
  const processName = eventModel.processNameSafeVersion(graphNode);
  const isNodeInactive = useSelector((state: ResolverState) =>
    selectors.isNodeInactive(state)(nodeID)
  );
  const relatedEventTotal = useSelector((state: ResolverState) => {
    return selectors.relatedEventTotalCount(state)(nodeID);
  });
  const eventTime = eventModel.eventTimestamp(graphNode);
  const dateTime = useFormattedDate(eventTime);

  const processInfoEntry: EuiDescriptionListProps['listItems'] = useMemo(() => {
    const createdEntry = {
      title: '@timestamp',
      description: dateTime,
    };

    const pathEntry = {
      title: 'process.executable',
      description: processPath(graphNode),
    };

    const pidEntry = {
      title: 'process.pid',
      description: processPID(graphNode),
    };

    const userEntry = {
      title: 'user.name',
      description: eventModel.userName(graphNode),
    };

    const domainEntry = {
      title: 'user.domain',
      description: eventModel.userDomain(graphNode),
    };

    const parentPidEntry = {
      title: 'process.parent.pid',
      description: eventModel.parentPID(graphNode),
    };

    const md5Entry = {
      title: 'process.hash.md5',
      description: eventModel.md5HashForProcess(graphNode),
    };

    const commandLineEntry = {
      title: 'process.args',
      description: eventModel.argsForProcess(graphNode),
    };

    // This is the data in {title, description} form for the EuiDescriptionList to display
    const processDescriptionListData = [
      createdEntry,
      pathEntry,
      pidEntry,
      userEntry,
      domainEntry,
      parentPidEntry,
      md5Entry,
      commandLineEntry,
    ]
      .filter((entry) => {
        return entry.description !== undefined;
      })
      .map((entry) => {
        return {
          ...entry,
          description: (
            <CopyablePanelField
              textToCopy={String(entry.description)}
              content={<GeneratedText>{String(entry.description)}</GeneratedText>}
            />
          ),
        };
      });

    return processDescriptionListData;
  }, [dateTime, graphNode]);

  const nodesLinkNavProps = useLinkProps({
    panelView: 'nodes',
  });

  const crumbs = useMemo(() => {
    return [
      {
        text: i18n.translate(
          'xpack.securitySolution.endpoint.resolver.panel.processDescList.events',
          {
            defaultMessage: 'Events',
          }
        ),
        'data-test-subj': 'resolver:node-detail:breadcrumbs:node-list-link',
        ...nodesLinkNavProps,
      },
      {
        text: (
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.detailsForProcessName"
            values={{ processName }}
            defaultMessage="Details for: {processName}"
          />
        ),
      },
    ];
  }, [processName, nodesLinkNavProps]);
  const { descriptionText } = useCubeAssets(isNodeInactive, false);

  const nodeDetailNavProps = useLinkProps({
    panelView: 'nodeEvents',
    panelParameters: { nodeID },
  });

  const titleID = useMemo(() => htmlIdGenerator('resolverTable')(), []);
  return (
    <>
      <Breadcrumbs breadcrumbs={crumbs} />
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <StyledTitle aria-describedby={titleID}>
          <StyledCubeForProcess
            data-test-subj="resolver:node-detail:title-icon"
            running={!isNodeInactive}
          />
          <span data-test-subj="resolver:node-detail:title">
            <GeneratedText>{processName}</GeneratedText>
          </span>
        </StyledTitle>
      </EuiTitle>
      <EuiText>
        <EuiTextColor color="subdued">
          <span id={titleID}>{descriptionText}</span>
        </EuiTextColor>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiLink {...nodeDetailNavProps} data-test-subj="resolver:node-detail:node-events-link">
        <FormattedMessage
          id="xpack.securitySolution.endpoint.resolver.panel.processDescList.numberOfEvents"
          values={{ relatedEventTotal }}
          defaultMessage="{relatedEventTotal} Events"
        />
      </EuiLink>
      <EuiSpacer size="l" />
      <StyledDescriptionList
        data-test-subj="resolver:node-detail"
        type="column"
        align="left"
        titleProps={
          {
            'data-test-subj': 'resolver:node-detail:entry-title',
            className: 'desc-title',
            // Casting this to allow data attribute
          } as HTMLAttributes<HTMLElement>
        }
        descriptionProps={
          { 'data-test-subj': 'resolver:node-detail:entry-description' } as HTMLAttributes<
            HTMLElement
          >
        }
        compressed
        listItems={processInfoEntry}
      />
    </>
  );
});
