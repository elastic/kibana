/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Investigation, InvestigationRevision } from '@kbn/investigate-plugin/common';
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
  investigation,
  revision,
  isAtLatestRevision,
  isAtEarliestRevision,
  hasUnsavedChanges,
}: {
  investigation: Pick<Investigation, 'title'>;
  revision: Pick<InvestigationRevision, 'items'>;
  isAtLatestRevision: boolean;
  isAtEarliestRevision: boolean;
  hasUnsavedChanges: boolean;
}) {
  const anyItems = revision.items.length > 0;

  const [loading, setLoading] = useState(false);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      alignItems="flexStart"
      justifyContent="flexStart"
    >
      <EuiFlexItem grow={false} className={titleClassName}>
        <EuiText size="s">{investigation.title}</EuiText>
      </EuiFlexItem>
      {anyItems ? (
        <>
          <EuiFlexItem grow={false} className={actionsClassName} />
        </>
      ) : null}
    </EuiFlexGroup>
  );
}
