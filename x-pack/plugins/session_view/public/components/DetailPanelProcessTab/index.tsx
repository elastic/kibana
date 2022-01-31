/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode } from 'react';
import { EuiTextColor } from '@elastic/eui';
import { DetailPanelProcess } from '../../types';
import { useStyles } from './styles';
import { DetailPanelAccordion } from '../DetailPanelAccordion';
import { DetailPanelCopy } from '../DetailPanelCopy';
import { DetailPanelDescriptionList } from '../DetailPanelDescriptionList';
import { DetailPanelListItem } from '../DetailPanelListItem';

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
  {
    id: 'processGroupLeader',
    title: 'Group Leader',
    tooltipContent: 'a group leader placeholder description',
  },
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
    processDetail.groupLeader,
    processDetail.parent,
  ].map((leader, idx) => {
    const listItems: ListItems = [
      {
        title: <DetailPanelListItem>id</DetailPanelListItem>,
        description: (
          <DetailPanelCopy textToCopy={leader.id}>
            <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
              {leader.id || '-'}
            </EuiTextColor>
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>start</DetailPanelListItem>,
        description: (
          <DetailPanelCopy textToCopy={leader.start.toISOString()}>
            <span css={styles.description}>{leader.start.toISOString()}</span>
          </DetailPanelCopy>
        ),
      },
    ];
    if (idx === 0) {
      listItems.push({
        title: <DetailPanelListItem>entry_meta.type</DetailPanelListItem>,
        description: (
          <DetailPanelCopy textToCopy={leader.entryMetaType}>
            <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
              {leader.entryMetaType || '-'}
            </EuiTextColor>
          </DetailPanelCopy>
        ),
      });
    }
    listItems.push(
      ...[
        {
          title: <DetailPanelListItem>user.name</DetailPanelListItem>,
          description: (
            <DetailPanelCopy textToCopy={leader.userName}>
              <span css={styles.description}>{leader.userName || '-'}</span>
            </DetailPanelCopy>
          ),
        },
        {
          title: <DetailPanelListItem>interactive</DetailPanelListItem>,
          description: (
            <DetailPanelCopy textToCopy={leader.interactive ? 'True' : 'False'}>
              <span css={styles.description}>{leader.interactive ? 'True' : 'False'}</span>
            </DetailPanelCopy>
          ),
        },
        {
          title: <DetailPanelListItem>pid</DetailPanelListItem>,
          description: (
            <DetailPanelCopy textToCopy={leader.pid.toString()}>
              <span css={styles.description}>{leader.pid ? leader.pid.toString() : '-'}</span>
            </DetailPanelCopy>
          ),
        },
      ]
    );
    if (idx === 0) {
      listItems.push({
        title: <DetailPanelListItem>entry_meta.source.ip</DetailPanelListItem>,
        description: (
          <DetailPanelCopy textToCopy={leader.entryMetaSourceIp}>
            <span css={styles.description}>{leader.entryMetaSourceIp || '-'}</span>
          </DetailPanelCopy>
        ),
      });
    }
    return {
      ...leaderDescriptionListInfo[idx],
      name: leader.name,
      listItems,
    };
  });

  const processArgs = processDetail.args.length
    ? `[${processDetail.args.map((arg) => `'${arg}'`)}]`
    : '-';

  return (
    <>
      <DetailPanelDescriptionList
        listItems={[
          {
            title: <DetailPanelListItem>id</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processDetail.id}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {processDetail.id || '-'}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>start</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processDetail.start.toISOString()}>
                <span css={styles.description}>{processDetail.start.toISOString()}</span>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>end</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processDetail.end.toISOString()}>
                <span css={styles.description}>{processDetail.end.toISOString()}</span>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>exit_code</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processDetail.exit_code.toString()}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {processDetail.exit_code || '-'}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>user</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processDetail.user}>
                <span css={styles.description}>{processDetail.user}</span>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>args</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processArgs}>
                <span css={styles.description}>{processArgs}</span>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>executable</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={processDetail.executable
                  .map((execTuple) => {
                    const [executable, eventAction] = execTuple;
                    return `${executable} ${eventAction}`;
                  })
                  .join(', ')}
                display="block"
              >
                {processDetail.executable.map((execTuple) => {
                  const [executable, eventAction] = execTuple;
                  return (
                    <div css={styles.description}>
                      <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                        {executable}
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
            title: <DetailPanelListItem>process.pid</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processDetail.pid.toString()}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {processDetail.pid || '-'}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
        ]}
      />
      {leaderListItems.map((leader) => (
        <DetailPanelAccordion
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
