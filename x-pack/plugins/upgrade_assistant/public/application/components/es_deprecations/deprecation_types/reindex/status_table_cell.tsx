/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
import { ReindexStatus } from '../../../../../../common/types';
import { LoadingState } from '../../../types';
import { useReindexContext } from './context';

const i18nTexts = {
  reindexLoadingStatusText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.reindexLoadingStatusText',
    {
      defaultMessage: 'Loading status…',
    }
  ),
  reindexInProgressText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.reindexInProgressText',
    {
      defaultMessage: 'Reindexing in progress…',
    }
  ),
  reindexCompleteText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.reindexCompleteText',
    {
      defaultMessage: 'Reindex complete',
    }
  ),
  reindexFailedText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.reindexFailedText',
    {
      defaultMessage: 'Reindex failed',
    }
  ),
  reindexCanceledText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.reindexCanceledText',
    {
      defaultMessage: 'Reindex canceled',
    }
  ),
  reindexPausedText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.reindexPausedText',
    {
      defaultMessage: 'Reindex paused',
    }
  ),
  criticalBadgeLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.criticalBadgeLabel',
    {
      defaultMessage: 'Critical',
    }
  ),
};

export const ReindexStatusCell: React.FunctionComponent = () => {
  const { reindexState } = useReindexContext();

  if (reindexState.loadingState === LoadingState.Loading) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18nTexts.reindexLoadingStatusText}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  switch (reindexState.status) {
    case ReindexStatus.inProgress:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.reindexInProgressText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case ReindexStatus.completed:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="check" color="success" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.reindexCompleteText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case ReindexStatus.failed:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="alert" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.reindexCompleteText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case ReindexStatus.paused:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="alert" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.reindexPausedText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case ReindexStatus.cancelled:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="alert" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.reindexCanceledText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
  }

  return <EuiBadge color="danger">{i18nTexts.criticalBadgeLabel}</EuiBadge>;
};
