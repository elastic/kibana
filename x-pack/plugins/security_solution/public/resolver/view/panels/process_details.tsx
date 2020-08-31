/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo, HTMLAttributes } from 'react';
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
import { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import * as selectors from '../../store/selectors';
import * as event from '../../../../common/endpoint/models/event';
import { formatDate, StyledBreadcrumbs, GeneratedText } from './panel_content_utilities';
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
import { useResolverTheme } from '../assets';
import { ResolverState } from '../../types';
import { useReplaceBreadcrumbParameters } from '../use_replace_breadcrumb_parameters';

const StyledDescriptionList = styled(EuiDescriptionList)`
  &.euiDescriptionList.euiDescriptionList--column dt.euiDescriptionList__title.desc-title {
    max-width: 10em;
  }
`;

const StyledTitle = styled('h4')`
  overflow-wrap: break-word;
`;

/**
 * A description list view of all the Metadata that goes with a particular process event, like:
 * Created, PID, User/Domain, etc.
 */
export const ProcessDetails = memo(function ProcessDetails({
  processEvent,
}: {
  processEvent: ResolverEvent;
}) {
  const processName = event.eventName(processEvent);
  const entityId = event.entityId(processEvent);
  const isProcessTerminated = useSelector((state: ResolverState) =>
    selectors.isProcessTerminated(state)(entityId)
  );
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

  const pushToQueryParams = useReplaceBreadcrumbParameters();

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

  const titleID = useMemo(() => htmlIdGenerator('resolverTable')(), []);
  return (
    <>
      <StyledBreadcrumbs breadcrumbs={crumbs} />
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <StyledTitle aria-describedby={titleID}>
          <CubeForProcess
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
