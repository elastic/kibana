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
import { getProcessExecutableCopyText } from './helpers';
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
      defaultMessage: 'A entry leader placeholder description',
    }),
  },
  {
    id: 'processSessionLeader',
    title: 'Session Leader',
    tooltipContent: i18n.translate('xpack.sessionView.detailPanel.sessionLeaderTooltip', {
      defaultMessage: 'A session leader placeholder description',
    }),
  },
  {
    id: 'processGroupLeader',
    title: 'Group Leader',
    tooltipContent: i18n.translate('xpack.sessionView.detailPanel.processGroupLeaderTooltip', {
      defaultMessage: 'a group leader placeholder description',
    }),
  },
  {
    id: 'processParent',
    title: 'Parent',
    tooltipContent: i18n.translate('xpack.sessionView.detailPanel.processParentTooltip', {
      defaultMessage: 'a parent placeholder description',
    }),
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
              {dataOrDash(leader.id)}
            </EuiTextColor>
          </DetailPanelCopy>
        ),
      },
      {
        title: <DetailPanelListItem>start</DetailPanelListItem>,
        description: (
          <DetailPanelCopy textToCopy={leader.start}>
            <span css={styles.description}>{leader.start}</span>
          </DetailPanelCopy>
        ),
      },
    ];
    // Only include entry_meta.type for entry leader
    if (idx === 0) {
      listItems.push({
        title: <DetailPanelListItem>entry_meta.type</DetailPanelListItem>,
        description: (
          <DetailPanelCopy textToCopy={leader.entryMetaType}>
            <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
              {dataOrDash(leader.entryMetaType)}
            </EuiTextColor>
          </DetailPanelCopy>
        ),
      });
    }
    listItems.push(
      {
        title: <DetailPanelListItem>user.name</DetailPanelListItem>,
        description: (
          <DetailPanelCopy textToCopy={leader.userName}>
            <span css={styles.description}>{dataOrDash(leader.userName)}</span>
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
          <DetailPanelCopy textToCopy={leader.pid}>
            <span css={styles.description}>{dataOrDash(leader.pid)}</span>
          </DetailPanelCopy>
        ),
      }
    );
    // Only include entry_meta.source.ip for entry leader
    if (idx === 0) {
      listItems.push({
        title: <DetailPanelListItem>entry_meta.source.ip</DetailPanelListItem>,
        description: (
          <DetailPanelCopy textToCopy={leader.entryMetaSourceIp}>
            <span css={styles.description}>{dataOrDash(leader.entryMetaSourceIp)}</span>
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
                  {dataOrDash(processDetail.id)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>start</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processDetail.start}>
                <span css={styles.description}>{processDetail.start}</span>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>end</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processDetail.end}>
                <span css={styles.description}>{processDetail.end}</span>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>exit_code</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processDetail.exit_code}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processDetail.exit_code)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>user</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processDetail.user}>
                <span css={styles.description}>{dataOrDash(processDetail.user)}</span>
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
                textToCopy={getProcessExecutableCopyText(processDetail.executable)}
                display="block"
              >
                {processDetail.executable.map((execTuple, idx) => {
                  const [executable, eventAction] = execTuple;
                  return (
                    <div key={`executable-${idx}`} css={styles.description}>
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
              <DetailPanelCopy textToCopy={processDetail.pid}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processDetail.pid)}
                </EuiTextColor>
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
