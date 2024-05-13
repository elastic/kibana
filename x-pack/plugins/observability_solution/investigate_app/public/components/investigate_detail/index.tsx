/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { InvestigateTimeline } from '@kbn/investigate-plugin/common';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';

const LOCK_ALL_LABEL = i18n.translate('xpack.investigateApp.investigateDetail.lockAllButtonLabel', {
  defaultMessage: 'Lock all',
});
const UNLOCK_ALL_LABEL = i18n.translate(
  'xpack.investigateApp.investigateDetail.unlockAllButtonLabel',
  { defaultMessage: 'Unlock all' }
);

const titleClassName = css`
  .euiText {
    font-weight: 500;
  }
`;

const actionsClassName = css``;

function InvestigateDetailButton({
  children,
  loading,
  iconType,
  dataTestSubj,
  onClick,
}: {
  children: string;
  loading: boolean;
  iconType: string;
  dataTestSubj: string;
  onClick: () => void;
}) {
  return (
    <EuiButtonEmpty
      data-test-subj={dataTestSubj}
      iconType={iconType}
      iconSize="s"
      onClick={onClick}
      color="text"
      size="s"
      isLoading={loading}
      disabled={loading}
    >
      <EuiText size="xs">{children}</EuiText>
    </EuiButtonEmpty>
  );
}

function LockAllButton(
  props: Omit<
    React.ComponentProps<typeof InvestigateDetailButton>,
    'iconType' | 'children' | 'dataTestSubj'
  >
) {
  return (
    <InvestigateDetailButton
      {...props}
      iconType="lock"
      dataTestSubj="investigateAppLockAllButtonButton"
    >
      {LOCK_ALL_LABEL}
    </InvestigateDetailButton>
  );
}

function UnlockAllButton(
  props: Omit<
    React.ComponentProps<typeof InvestigateDetailButton>,
    'iconType' | 'children' | 'dataTestSubj'
  >
) {
  return (
    <InvestigateDetailButton
      {...props}
      iconType="lockOpen"
      dataTestSubj="investigateAppUnlockAllButtonButton"
    >
      {UNLOCK_ALL_LABEL}
    </InvestigateDetailButton>
  );
}

export function InvestigateDetail({
  timeline,
  onLockAllClick,
  onUnlockAllClick,
}: {
  timeline: Pick<InvestigateTimeline, 'title'> & {
    items: Array<Pick<InvestigateTimeline['items'][number], 'locked'>>;
  };
  onLockAllClick: () => Promise<void>;
  onUnlockAllClick: () => Promise<void>;
}) {
  const anyItems = timeline.items.length > 0;

  const allItemsLocked = timeline.items.every((item) => item.locked);

  const [loading, setLoading] = useState(false);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      alignItems="flexStart"
      justifyContent="flexStart"
    >
      <EuiFlexItem grow={false} className={titleClassName}>
        <EuiText size="s">{timeline.title}</EuiText>
      </EuiFlexItem>
      {anyItems ? (
        <>
          <EuiFlexItem grow={false} className={actionsClassName}>
            {allItemsLocked ? (
              <UnlockAllButton
                loading={loading}
                onClick={() => {
                  setLoading(true);
                  onUnlockAllClick().finally(() => {
                    setLoading(false);
                  });
                }}
              />
            ) : (
              <LockAllButton
                loading={loading}
                onClick={() => {
                  setLoading(true);
                  onLockAllClick().finally(() => {
                    setLoading(false);
                  });
                }}
              />
            )}
          </EuiFlexItem>
        </>
      ) : null}
    </EuiFlexGroup>
  );
}
