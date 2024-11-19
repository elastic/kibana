/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode, useCallback, useMemo } from 'react';
import { EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Process } from '../../../common';
import { DetailPanelAccordion } from '../detail_panel_accordion';
import { DetailPanelCopy } from '../detail_panel_copy';
import { DetailPanelDescriptionList } from '../detail_panel_description_list';
import { DetailPanelListItem } from '../detail_panel_list_item';
import { dataOrDash } from '../../utils/data_or_dash';
import { getProcessExecutableCopyText, getDetailPanelProcess } from './helpers';
import { useStyles } from './styles';

interface DetailPanelProcessTabDeps {
  selectedProcess: Process | null;
  index: string;
}

type ListItems = Array<{
  title: NonNullable<ReactNode>;
  description: NonNullable<ReactNode>;
}>;

// TODO: Update placeholder descriptions for these tootips once UX Writer Team Defines them
const leaderDescriptionListInfo = [
  {
    id: 'processEntryLeader',
    title: 'Entry Leader',
    tooltipContent: i18n.translate('xpack.sessionView.detailPanel.entryLeaderTooltip', {
      defaultMessage:
        'Session leader process associated with initial terminal or remote access via SSH, SSM and other remote access protocols. Entry sessions are also used to represent a service directly started by the init process. In many cases this is the same as the session_leader.',
    }),
  },
  {
    id: 'processSessionLeader',
    title: 'Session Leader',
    tooltipContent: i18n.translate('xpack.sessionView.detailPanel.sessionLeaderTooltip', {
      defaultMessage:
        'Often the same as entry_leader. When it differs, this represents a session started within another session. Some tools like tmux and screen will start a new session to obtain a new tty and/or separate their lifecycle from the entry session.',
    }),
  },
  {
    id: 'processGroupLeader',
    title: 'Group Leader',
    tooltipContent: i18n.translate('xpack.sessionView.detailPanel.processGroupLeaderTooltip', {
      defaultMessage: 'The process group leader to the current process.',
    }),
  },
  {
    id: 'processParent',
    title: 'Parent',
    tooltipContent: i18n.translate('xpack.sessionView.detailPanel.processParentTooltip', {
      defaultMessage: 'The direct parent to the current process.',
    }),
  },
];

const PROCESS_FIELD_PREFIX = 'process';
const LEADER_FIELD_PREFIX = [
  `${PROCESS_FIELD_PREFIX}.entry_leader`,
  `${PROCESS_FIELD_PREFIX}.session_leader`,
  `${PROCESS_FIELD_PREFIX}.group_leader`,
  `${PROCESS_FIELD_PREFIX}.parent`,
];

/**
 * Detail panel in the session view.
 */
export const DetailPanelProcessTab = ({ selectedProcess, index }: DetailPanelProcessTabDeps) => {
  const styles = useStyles();

  const processDetail = useMemo(
    () => getDetailPanelProcess(selectedProcess, index),
    [selectedProcess, index]
  );
  const renderExecs = useCallback(
    (executable: string[][]) =>
      executable.map((execTuple, idx) => {
        const [exec, eventAction] = execTuple;
        return (
          <div key={`executable-${idx}`} css={styles.ellipsis}>
            <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
              {exec}
            </EuiTextColor>
            {eventAction && (
              <EuiTextColor color="subdued" css={styles.executableAction}>
                {eventAction}
              </EuiTextColor>
            )}
          </div>
        );
      }),
    [styles.descriptionSemibold, styles.ellipsis, styles.executableAction]
  );

  const leaderListItems = [
    processDetail.entryLeader,
    processDetail.sessionLeader,
    processDetail.groupLeader,
    processDetail.parent,
  ].map((leader, idx) => {
    const {
      id,
      start,
      end,
      exitCode,
      entryMetaType,
      interactive,
      workingDirectory,
      args,
      executable,
      pid,
      userId,
      userName,
      groupId,
      groupName,
      entryMetaSourceIp,
    } = leader;

    const leaderExecutableText = getProcessExecutableCopyText(executable);
    const listItems: ListItems = [
      {
        title: <DetailPanelListItem>entity_id</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.entity_id: "${id}"`}
            tooltipContent={id}
          >
            <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
              {id}
            </EuiTextColor>
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>args</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.args: "${args}"`}
            tooltipContent={args}
          >
            {args}
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>executable</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.executable: "${leaderExecutableText}"`}
            tooltipContent={leaderExecutableText}
          >
            {renderExecs(executable)}
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>interactive</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.interactive: "${interactive}"`}
            tooltipContent={interactive}
          >
            <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
              {interactive}
            </EuiTextColor>
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>working_directory</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.working_directory: "${workingDirectory}"`}
            tooltipContent={workingDirectory}
          >
            <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
              {workingDirectory}
            </EuiTextColor>
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>pid</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.pid: "${pid}"`}
            tooltipContent={pid}
          >
            <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
              {pid}
            </EuiTextColor>
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>start</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.start: "${start}"`}
            tooltipContent={start}
          >
            {start}
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>end</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.end: "${end}"`}
            tooltipContent={end}
          >
            {end}
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>exit_code</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.exit_code: "${exitCode}"`}
            tooltipContent={exitCode}
          >
            <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
              {exitCode}
            </EuiTextColor>
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>user.id</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.user.id: "${userId}"`}
            tooltipContent={userId}
          >
            {userId}
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>user.name</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.user.name: "${userName}"`}
            tooltipContent={userName}
          >
            {userName}
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>group.id</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.group.id: "${groupId}"`}
            tooltipContent={groupId}
          >
            {groupId}
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>group.name</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.group.name: "${groupName}"`}
            tooltipContent={groupName}
          >
            {groupName}
          </DetailPanelCopy>
        ),
      },
    ];
    // Only include entry_meta.type and entry_meta.source.ip for entry leader
    if (idx === 0) {
      listItems.push(
        {
          title: <DetailPanelListItem>entry_meta.type</DetailPanelListItem>,
          description: (
            <DetailPanelCopy
              textToCopy={`${LEADER_FIELD_PREFIX[idx]}.entry_meta.type: "${entryMetaType}"`}
              tooltipContent={entryMetaType}
            >
              <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                {entryMetaType}
              </EuiTextColor>
            </DetailPanelCopy>
          ),
        },
        {
          title: <DetailPanelListItem>entry_meta.source.ip</DetailPanelListItem>,
          description: (
            <DetailPanelCopy
              textToCopy={`${LEADER_FIELD_PREFIX[idx]}.entry_meta.source.ip: "${entryMetaSourceIp}"`}
              tooltipContent={entryMetaSourceIp}
            >
              {dataOrDash(entryMetaSourceIp)}
            </DetailPanelCopy>
          ),
        }
      );
    }

    return {
      ...leaderDescriptionListInfo[idx],
      name: leader.name,
      listItems,
    };
  });

  const {
    id,
    start,
    end,
    executable,
    exitCode,
    pid,
    workingDirectory,
    interactive,
    userId,
    userName,
    groupId,
    groupName,
    args,
  } = processDetail;
  const executableText = getProcessExecutableCopyText(executable);

  return (
    <>
      <DetailPanelDescriptionList
        listItems={[
          {
            title: <DetailPanelListItem>entity_id</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.entity_id: "${id}"`}
                tooltipContent={id}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {id}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>args</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.args: "${args}"`}
                tooltipContent={args}
              >
                {args}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>executable</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.executable: "${executableText}"`}
                tooltipContent={executableText}
                display="block"
              >
                {renderExecs(executable)}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>interactive</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.interactive: "${interactive}"`}
                tooltipContent={interactive}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {interactive}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>working_directory</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.working_directory: "${workingDirectory}"`}
                tooltipContent={workingDirectory}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {workingDirectory}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>pid</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.pid: "${pid}"`}
                tooltipContent={pid}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {pid}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>start</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.start: "${start}"`}
                tooltipContent={start}
              >
                {start}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>end</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.end: "${end}"`}
                tooltipContent={end}
              >
                {end}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>exit_code</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.exit_code: "${exitCode}"`}
                tooltipContent={exitCode}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {exitCode}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>user.id</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.user.id: "${userId}"`}
                tooltipContent={userId}
              >
                {userId}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>user.name</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.user.name: "${userName}"`}
                tooltipContent={userName}
              >
                {userName}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>group.id</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.group.id: "${groupId}"`}
                tooltipContent={groupId}
              >
                {groupId}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>group.name</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.group.name: "${groupName}"`}
                tooltipContent={groupName}
              >
                {groupName}
              </DetailPanelCopy>
            ),
          },
        ]}
      />
      {leaderListItems.map((leader) => (
        <DetailPanelAccordion
          key={leader.id}
          id={leader.id}
          title={leader.title}
          tooltipContent={leader.tooltipContent}
          listItems={leader.listItems}
          extraActionTitle={leader.name}
        />
      ))}
    </>
  );
};
