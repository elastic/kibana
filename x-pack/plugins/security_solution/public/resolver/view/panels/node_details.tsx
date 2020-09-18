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
import { FormattedMessage } from 'react-intl';
import styled from 'styled-components';
import { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import { StyledDescriptionList, StyledTitle } from './styles';
import * as selectors from '../../store/selectors';
import * as event from '../../../../common/endpoint/models/event';
import { formatDate, GeneratedText } from './panel_content_utilities';
import { Breadcrumbs } from './breadcrumbs';
import {
  processPath,
  processPid,
  userInfoForProcess,
  processParentPid,
  md5HashForProcess,
  argsForProcess,
} from '../../models/process_event';
import { CubeForProcess } from './cube_for_process';
import { ResolverEvent } from '../../../../common/endpoint/types';
import { useCubeAssets } from '../use_cube_assets';
import { ResolverState } from '../../types';
import { PanelLoading } from './panel_loading';
import { StyledPanel } from '../styles';
import { useNavigateOrReplace } from '../use_navigate_or_replace';

const StyledCubeForProcess = styled(CubeForProcess)`
  position: relative;
  top: 0.75em;
`;

export const NodeDetail = memo(function ({ nodeID }: { nodeID: string }) {
  const processEvent = useSelector((state: ResolverState) =>
    selectors.processEventForID(state)(nodeID)
  );
  return (
    <StyledPanel>
      {processEvent === null ? <PanelLoading /> : <NodeDetailView processEvent={processEvent} />}
    </StyledPanel>
  );
});

/**
 * A description list view of all the Metadata that goes with a particular process event, like:
 * Created, PID, User/Domain, etc.
 */
const NodeDetailView = memo(function ({ processEvent }: { processEvent: ResolverEvent }) {
  const processName = event.eventName(processEvent);
  const entityId = event.entityId(processEvent);
  const isProcessTerminated = useSelector((state: ResolverState) =>
    selectors.isProcessTerminated(state)(entityId)
  );
  const relatedEventTotal = useSelector((state: ResolverState) => {
    return selectors.relatedEventAggregateTotalByEntityId(state)(entityId);
  });
  const processInfoEntry: EuiDescriptionListProps['listItems'] = useMemo(() => {
    const eventTime = event.eventTimestamp(processEvent);
    const dateTime = eventTime === undefined ? null : formatDate(eventTime);

    const createdEntry = {
      title: '@timestamp',
      description: dateTime,
    };

    const pathEntry = {
      title: 'process.executable',
      description: processPath(processEvent),
    };

    const pidEntry = {
      title: 'process.pid',
      description: processPid(processEvent),
    };

    const userEntry = {
      title: 'user.name',
      description: userInfoForProcess(processEvent)?.name,
    };

    const domainEntry = {
      title: 'user.domain',
      description: userInfoForProcess(processEvent)?.domain,
    };

    const parentPidEntry = {
      title: 'process.parent.pid',
      description: processParentPid(processEvent),
    };

    const md5Entry = {
      title: 'process.hash.md5',
      description: md5HashForProcess(processEvent),
    };

    const commandLineEntry = {
      title: 'process.args',
      description: argsForProcess(processEvent),
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
          description: <GeneratedText>{String(entry.description)}</GeneratedText>,
        };
      });

    return processDescriptionListData;
  }, [processEvent]);

  const nodesHref = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)({ panelView: 'nodes' })
  );

  const nodesLinkNavProps = useNavigateOrReplace({
    search: nodesHref,
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
        onClick: () => {},
      },
    ];
  }, [processName, nodesLinkNavProps]);
  const { descriptionText } = useCubeAssets(isProcessTerminated, false);

  const nodeDetailHref = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)({
      panelView: 'nodeEvents',
      panelParameters: { nodeID: entityId },
    })
  );

  const nodeDetailNavProps = useNavigateOrReplace({
    search: nodeDetailHref!,
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
            running={!isProcessTerminated}
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
      <EuiLink {...nodeDetailNavProps}>
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
