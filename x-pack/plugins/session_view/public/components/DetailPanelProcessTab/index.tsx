/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode } from 'react';
import { EuiText, EuiTextColor } from '@elastic/eui';
import { DetailPanelProcess } from '../../types';
import { useStyles } from './styles';
import { DetailPanelAccordion } from '../DetailPanelAccordion';
import { DetailPanelDescriptionList } from '../DetailPanelDescriptionList';

interface DetailPanelProcessTabDeps {
  processDetail: DetailPanelProcess;
}

type ListItems = Array<{
  title: NonNullable<ReactNode>;
  description: NonNullable<ReactNode>;
}>;

const leaderDescriptionListInfo = [
  {
    id: 'processEntryLeader',
    title: 'Entry Leader',
    tooltipContent: 'a entry leader placeholder description',
  },
  {
    id: 'processSessionLeader',
    title: 'Session Leader',
    tooltipContent: 'a session leader placeholder description',
  },
  // {
  //   id: 'processGroupLeader',
  //   title: 'Group Leader',
  //   tooltipContent: 'a group leader placeholder description',
  // },
  {
    id: 'processParent',
    title: 'Parent',
    tooltipContent: 'a parent placeholder description',
  },
];

/**
 * Detail panel in the session view.
 */
export const DetailPanelProcessTab = ({ processDetail }: DetailPanelProcessTabDeps) => {
  const styles = useStyles();
  const leaderListItems = [
    processDetail.entryLeader,
    processDetail.sessionLeader,
    // processDetail.groupLeader,
    processDetail.parent,
  ].map((leader, idx) => {
    const listItems: ListItems = [
      {
        title: 'id',
        description: (
          <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
            {leader.id}
          </EuiTextColor>
        ),
      },
      {
        title: 'start',
        description: leader.start,
      },
    ];
    if (idx === 0) {
      listItems.push({
        title: 'entry_meta.type',
        description: (
          <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
            {leader.entryMetaType || '-'}
          </EuiTextColor>
        ),
      });
    }
    listItems.push(
      ...[
        {
          title: 'user.name',
          description: leader.userName,
        },
        {
          title: 'interactive',
          description: leader.interactive ? 'True' : 'False',
        },
        {
          title: 'pid',
          description: leader.pid.toString(),
        },
      ]
    );
    if (idx === 0) {
      listItems.push({
        title: 'entry_meta.source.ip',
        description: leader.entryMetaSourceIp,
      });
    }
    return {
      ...leaderDescriptionListInfo[idx],
      listItems,
    };
  });

  return (
    <>
      <DetailPanelDescriptionList
        listItems={[
          {
            title: 'id',
            description: (
              <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
                {processDetail.id}
              </EuiTextColor>
            ),
          },
          {
            title: 'start',
            description: processDetail.start,
          },
          {
            title: 'end',
            description: processDetail.end,
          },
          {
            title: 'exit_code',
            description: (
              <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
                {processDetail.exit_code || '-'}
              </EuiTextColor>
            ),
          },
          {
            title: 'user',
            description: processDetail.user,
          },
          {
            title: 'args',
            description: processDetail.args.length
              ? `[${processDetail.args.map((arg) => `'${arg}'`)}]`
              : '-',
          },
          {
            title: 'executable',
            description: processDetail.executable.map((execTuple) => {
              const [executable, eventAction] = execTuple;
              return (
                <EuiText>
                  <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
                    {executable}
                  </EuiTextColor>
                  <EuiTextColor color="subdued" css={styles.executableAction}>
                    {eventAction}
                  </EuiTextColor>
                </EuiText>
              );
            }),
          },
          {
            title: 'process.pid',
            description: processDetail.pid,
          },
        ]}
      />
      {leaderListItems.map((leader) => (
        <DetailPanelAccordion
          id={leader.id}
          title={leader.title}
          tooltipContent={leader.tooltipContent}
          listItems={leader.listItems}
        />
      ))}
    </>
  );
};
