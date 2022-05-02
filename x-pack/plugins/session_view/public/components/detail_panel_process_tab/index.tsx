/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode } from 'react';
import { EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DetailPanelProcess } from '../../types';
import { DetailPanelAccordion } from '../detail_panel_accordion';
import { DetailPanelCopy } from '../detail_panel_copy';
import { DetailPanelDescriptionList } from '../detail_panel_description_list';
import { DetailPanelListItem } from '../detail_panel_list_item';
import { dataOrDash } from '../../utils/data_or_dash';
import { getProcessExecutableCopyText, formatProcessArgs, getIsInterativeString } from './helpers';
import { useStyles } from './styles';

interface DetailPanelProcessTabDeps {
  processDetail: DetailPanelProcess;
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
export const DetailPanelProcessTab = ({ processDetail }: DetailPanelProcessTabDeps) => {
  const styles = useStyles();
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
      exit_code: exitCode,
      entryMetaType,
      tty,
      working_directory: workingDirectory,
      args,
      pid,
      userName,
      groupName,
      entryMetaSourceIp,
    } = leader;
    const leaderArgs = formatProcessArgs(args);
    const isLeaderInteractive = getIsInterativeString(tty);
    const listItems: ListItems = [
      {
        title: <DetailPanelListItem>entity_id</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.entity_id: "${dataOrDash(id)}"`}
          >
            <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
              {dataOrDash(id)}
            </EuiTextColor>
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>args</DetailPanelListItem>,
        description: (
          <DetailPanelCopy textToCopy={`${LEADER_FIELD_PREFIX[idx]}.args: "${leaderArgs}"`}>
            {leaderArgs}
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>interactive</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.interactive: "${isLeaderInteractive}"`}
          >
            <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
              {isLeaderInteractive}
            </EuiTextColor>
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>working_directory</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.working_directory: "${dataOrDash(
              workingDirectory
            )}"`}
          >
            <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
              {dataOrDash(workingDirectory)}
            </EuiTextColor>
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>pid</DetailPanelListItem>,
        description: (
          <DetailPanelCopy textToCopy={`${LEADER_FIELD_PREFIX[idx]}.pid: "${dataOrDash(pid)}"`}>
            <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
              {dataOrDash(pid)}
            </EuiTextColor>
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>start</DetailPanelListItem>,
        description: (
          <DetailPanelCopy textToCopy={`${LEADER_FIELD_PREFIX[idx]}.start: "${dataOrDash(start)}"`}>
            {dataOrDash(start)}
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>end</DetailPanelListItem>,
        description: (
          <DetailPanelCopy textToCopy={`${LEADER_FIELD_PREFIX[idx]}.end: "${dataOrDash(end)}"`}>
            {dataOrDash(end)}
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>exit_code</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.exit_code: "${dataOrDash(exitCode)}"`}
          >
            <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
              {dataOrDash(exitCode)}
            </EuiTextColor>
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>user.name</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.user.name: "${dataOrDash(userName)}"`}
          >
            {dataOrDash(userName)}
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>group.name</DetailPanelListItem>,
        description: (
          <DetailPanelCopy
            textToCopy={`${LEADER_FIELD_PREFIX[idx]}.group.name: "${dataOrDash(groupName)}"`}
          >
            {dataOrDash(groupName)}
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
              textToCopy={`${LEADER_FIELD_PREFIX[idx]}.entry_meta.type: "${dataOrDash(
                entryMetaType
              )}"`}
            >
              <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                {dataOrDash(entryMetaType)}
              </EuiTextColor>
            </DetailPanelCopy>
          ),
        },
        {
          title: <DetailPanelListItem>entry_meta.source.ip</DetailPanelListItem>,
          description: (
            <DetailPanelCopy
              textToCopy={`${LEADER_FIELD_PREFIX[idx]}.entry_meta.source.ip: "${dataOrDash(
                entryMetaSourceIp
              )}"`}
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
    exit_code: exitCode,
    pid,
    working_directory: workingDirectory,
    tty,
    userName,
    groupName,
    args,
  } = processDetail;

  const isInteractive = getIsInterativeString(tty);
  const processArgs = formatProcessArgs(args);

  return (
    <>
      <DetailPanelDescriptionList
        listItems={[
          {
            title: <DetailPanelListItem>entity_id</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.entity_id: "${dataOrDash(id)}"`}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(id)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>args</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={`${PROCESS_FIELD_PREFIX}.args: "${processArgs}"`}>
                {processArgs}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>executable</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.executable: "${getProcessExecutableCopyText(
                  executable
                )}"`}
                display="block"
              >
                {executable.map((execTuple, idx) => {
                  const [exec, eventAction] = execTuple;
                  return (
                    <div key={`executable-${idx}`} css={styles.ellipsis}>
                      <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                        {dataOrDash(exec)}
                      </EuiTextColor>
                      <EuiTextColor color="subdued" css={styles.executableAction}>
                        {eventAction}
                      </EuiTextColor>
                    </div>
                  );
                })}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>interactive</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.interactive: "${isInteractive}"`}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {isInteractive}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>working_directory</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.working_directory: "${dataOrDash(
                  workingDirectory
                )}"`}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(workingDirectory)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>pid</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={`${PROCESS_FIELD_PREFIX}.pid: "${dataOrDash(pid)}"`}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(pid)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>start</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={`${PROCESS_FIELD_PREFIX}.start: "${dataOrDash(start)}"`}>
                {dataOrDash(start)}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>end</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={`${PROCESS_FIELD_PREFIX}.end: "${dataOrDash(end)}"`}>
                {dataOrDash(end)}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>exit_code</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.exit_code: "${dataOrDash(exitCode)}"`}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(exitCode)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>user.name</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.user.name: "${dataOrDash(userName)}"`}
              >
                {dataOrDash(userName)}
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>group.name</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`${PROCESS_FIELD_PREFIX}.group.name: "${dataOrDash(groupName)}"`}
              >
                {dataOrDash(groupName)}
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
