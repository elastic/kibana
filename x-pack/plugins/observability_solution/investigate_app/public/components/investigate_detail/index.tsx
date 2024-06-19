/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Investigation } from '@kbn/investigate-plugin/common';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';

const titleClassName = css`
  .euiText {
    font-weight: 500;
  }
`;

function InvestigateDetailButton({
  children,
  loading,
  iconType,
  dataTestSubj,
  onClick,
  disabled,
  iconSide,
}: {
  children: string;
  loading?: boolean;
  iconType: string;
  dataTestSubj: string;
  onClick: () => void;
  disabled?: boolean;
  iconSide: 'left' | 'right';
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
      disabled={disabled || loading}
      iconSide={iconSide}
    >
      <EuiText size="xs">{children}</EuiText>
    </EuiButtonEmpty>
  );
}

export function InvestigateDetail({
  investigation,
  isAtLatestRevision,
  isAtEarliestRevision,
  onUndoClick,
  onRedoClick,
}: {
  investigation: Pick<Investigation, 'title'>;
  isAtLatestRevision: boolean;
  isAtEarliestRevision: boolean;
  onUndoClick: () => void;
  onRedoClick: () => void;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s" alignItems="stretch" justifyContent="flexStart">
      <EuiFlexItem grow={false} className={titleClassName}>
        <EuiText size="s">{investigation.title}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          direction="row"
          gutterSize="s"
          justifyContent="spaceBetween"
          alignItems="stretch"
        >
          <EuiFlexItem grow={false}>
            <InvestigateDetailButton
              disabled={isAtEarliestRevision}
              onClick={onUndoClick}
              iconType="editorUndo"
              dataTestSubj="investigateDetailUndoButton"
              iconSide="left"
            >
              {i18n.translate(
                'xpack.investigateApp.investigateDetail.investigateDetailButton.undoLabel',
                { defaultMessage: 'Undo' }
              )}
            </InvestigateDetailButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <InvestigateDetailButton
              disabled={isAtLatestRevision}
              onClick={onRedoClick}
              iconType="editorRedo"
              dataTestSubj="investigateDetailRedoButton"
              iconSide="right"
            >
              {i18n.translate(
                'xpack.investigateApp.investigateDetail.investigateDetailButton.redoLabel',
                { defaultMessage: 'Redo' }
              )}
            </InvestigateDetailButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
