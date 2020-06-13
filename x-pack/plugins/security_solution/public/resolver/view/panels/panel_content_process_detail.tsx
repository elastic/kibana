/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo } from 'react';
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
import * as event from '../../../../common/endpoint/models/event';
import { CrumbInfo, formatDate, StyledBreadcrumbs } from '../panel';
import {
  hostPathForProcess,
  hostPidForProcess,
  userInfoForProcess,
  hostParentPidForProcess,
  md5HashForProcess,
  argsForProcess,
} from '../../models/process_event';
import { CubeForProcess } from './process_cube_icon';
import { ResolverEvent } from '../../../../common/endpoint/types';
import { useResolverTheme } from '../assets';

const StyledDescriptionList = styled(EuiDescriptionList)`
  &.euiDescriptionList.euiDescriptionList--column dt.euiDescriptionList__title.desc-title {
    max-width: 8em;
  }
`;

/**
 * A description list view of all the Metadata that goes with a particular process event, like:
 * Created, Pid, User/Domain, etc.
 */
export const ProcessDetails = memo(function ProcessDetails({
  processEvent,
  pushToQueryParams,
}: {
  processEvent: ResolverEvent;
  pushToQueryParams: (arg0: CrumbInfo) => unknown;
}) {
  const processName = processEvent && event.eventName(processEvent);
  const processInfoEntry = useMemo(() => {
    let dateTime = '';
    const eventTime = processEvent && event.eventTimestamp(processEvent);
    if (eventTime) {
      dateTime = formatDate(eventTime);
    }

    const processInfo = processEvent
      ? {
          [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.created', {
            defaultMessage: 'Created',
          })]: dateTime,
          [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.path', {
            defaultMessage: 'Path',
          })]: hostPathForProcess(processEvent),
          [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.pid', {
            defaultMessage: 'PID',
          })]: hostPidForProcess(processEvent),
          [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.user', {
            defaultMessage: 'User',
          })]: (userInfoForProcess(processEvent) as { name: string; domain: string }).name,
          [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.domain', {
            defaultMessage: 'Domain',
            [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.parentPid', {
              defaultMessage: 'Parent PID',
            })]: hostParentPidForProcess(processEvent),
          })]: (userInfoForProcess(processEvent) as { name: string; domain: string }).domain,
          [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.md5hash', {
            defaultMessage: 'MD5',
          })]: md5HashForProcess(processEvent),
          [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.commandLine', {
            defaultMessage: 'Command Line',
          })]: argsForProcess(processEvent),
        }
      : {};

    return Object.entries(processInfo)
      .filter(([, description]) => {
        return description;
      })
      .map(([title, description]) => {
        return { title, description: String(description) };
      });
  }, [processEvent]);

  const crumbs = useMemo(() => {
    return [
      {
        text: i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.events', {
          defaultMessage: 'Events',
        }),
        onClick: () => {
          pushToQueryParams({ crumbId: '', crumbEvent: '' });
        },
      },
      {
        text:
          i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.details', {
            defaultMessage: 'Details for: ',
          }) + processName,
        onClick: () => {},
      },
    ];
  }, [processName, pushToQueryParams]);
  const { cubeAssetsForNode } = useResolverTheme();
  const { descriptionText } = useMemo(() => {
    if (!processEvent) {
      return { descriptionText: '' };
    }
    return cubeAssetsForNode(processEvent);
  }, [processEvent, cubeAssetsForNode]);

  const titleId = useMemo(() => htmlIdGenerator('resolverTable')(), []);
  return (
    <>
      <StyledBreadcrumbs breadcrumbs={crumbs} />
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h4 aria-describedby={titleId}>
          <CubeForProcess processEvent={processEvent} />
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
