/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import {
  htmlIdGenerator,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiTextColor,
  EuiDescriptionList,
} from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from 'react-intl';
import * as selectors from '../../store/selectors';
import * as event from '../../../../common/endpoint/models/event';
import { CrumbInfo, formatDate, StyledBreadcrumbs } from './panel_content_utilities';
import {
  processPath,
  processPid,
  userInfoForProcess,
  processParentPid,
  md5HashForProcess,
  argsForProcess,
} from '../../models/process_event';
import { CubeForProcess } from './process_cube_icon';
import { ResolverEvent } from '../../../../common/endpoint/types';
import { useResolverTheme } from '../assets';

const StyledDescriptionList = styled(EuiDescriptionList)`
  &.euiDescriptionList.euiDescriptionList--column dt.euiDescriptionList__title.desc-title {
    max-width: 10em;
  }
`;

/**
 * A description list view of all the Metadata that goes with a particular process event, like:
 * Created, PID, User/Domain, etc.
 */
export const ProcessDetails = memo(function ProcessDetails({
  processEvent,
  pushToQueryParams,
}: {
  processEvent: ResolverEvent;
  pushToQueryParams: (queryStringKeyValuePair: CrumbInfo) => unknown;
}) {
  const processName = event.eventName(processEvent);
  const entityId = event.entityId(processEvent);
  const isProcessTerminated = useSelector(selectors.isProcessTerminated)(entityId);
  const processInfoEntry = useMemo(() => {
    const eventTime = event.eventTimestamp(processEvent);
    const dateTime = eventTime ? formatDate(eventTime) : '';

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

    // This is the data in {title, description} form for the EUIDescriptionList to display
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
        return entry.description;
      })
      .map((entry) => {
        return {
          ...entry,
          description: String(entry.description),
        };
      });

    return processDescriptionListData;
  }, [processEvent]);

  const crumbs = useMemo(() => {
    return [
      {
        text: i18n.translate(
          'xpack.securitySolution.endpoint.resolver.panel.processDescList.events',
          {
            defaultMessage: 'Events',
          }
        ),
        onClick: () => {
          pushToQueryParams({ crumbId: '', crumbEvent: '' });
        },
      },
      {
        text: (
          <>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.detailsForProcessName"
              values={{ processName }}
              defaultMessage="Details for: {processName}"
            />
          </>
        ),
        onClick: () => {},
      },
    ];
  }, [processName, pushToQueryParams]);
  const { cubeAssetsForNode } = useResolverTheme();
  const { descriptionText } = useMemo(() => {
    if (!processEvent) {
      return { descriptionText: '' };
    }
    return cubeAssetsForNode(isProcessTerminated, false);
  }, [processEvent, cubeAssetsForNode, isProcessTerminated]);

  const titleId = useMemo(() => htmlIdGenerator('resolverTable')(), []);
  return (
    <>
      <StyledBreadcrumbs breadcrumbs={crumbs} />
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h4 aria-describedby={titleId}>
          <CubeForProcess isProcessTerminated={isProcessTerminated} />
          {processName}
        </h4>
      </EuiTitle>
      <EuiText>
        <EuiTextColor color="subdued">
          <span id={titleId}>{descriptionText}</span>
        </EuiTextColor>
      </EuiText>
      <EuiSpacer size="l" />
      <StyledDescriptionList
        type="column"
        align="left"
        titleProps={{ className: 'desc-title' }}
        compressed
        listItems={processInfoEntry}
      />
    </>
  );
});
ProcessDetails.displayName = 'ProcessDetails';
