/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, FunctionComponent } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EnrichedDeprecationInfo,
  MlAction,
  ReindexAction,
  IndexSettingAction,
} from '../../../../../common/types';
import { AppContext } from '../../../app_context';
import { ReindexButton } from './reindex';
import { FixIndexSettingsButton } from './index_settings';
import { FixMlSnapshotsButton } from './ml_snapshots';

interface DeprecationCellProps {
  items?: Array<{ title?: string; body: string }>;
  docUrl?: string;
  headline?: string;
  healthColor?: string;
  children?: ReactNode;
  correctiveAction?: EnrichedDeprecationInfo['correctiveAction'];
  indexName?: string;
}

interface CellActionProps {
  correctiveAction: EnrichedDeprecationInfo['correctiveAction'];
  indexName?: string;
  items: Array<{ title?: string; body: string }>;
}

const CellAction: FunctionComponent<CellActionProps> = ({ correctiveAction, indexName, items }) => {
  const { type: correctiveActionType } = correctiveAction!;
  switch (correctiveActionType) {
    case 'mlSnapshot':
      const { jobId, snapshotId } = correctiveAction as MlAction;
      return (
        <FixMlSnapshotsButton
          jobId={jobId}
          snapshotId={snapshotId}
          // There will only ever be a single item for the cluster deprecations list, so we can use the index to access the first one
          description={items[0]?.body}
        />
      );

    case 'reindex':
      const { blockerForReindexing } = correctiveAction as ReindexAction;

      return (
        <AppContext.Consumer>
          {({ http, docLinks }) => (
            <ReindexButton
              docLinks={docLinks}
              reindexBlocker={blockerForReindexing}
              indexName={indexName!}
              http={http}
            />
          )}
        </AppContext.Consumer>
      );

    case 'indexSetting':
      const { deprecatedSettings } = correctiveAction as IndexSettingAction;

      return <FixIndexSettingsButton settings={deprecatedSettings} index={indexName!} />;

    default:
      throw new Error(`No UI defined for corrective action: ${correctiveActionType}`);
  }
};

/**
 * Used to display a deprecation with links to docs, a health indicator, and other descriptive information.
 */
export const DeprecationCell: FunctionComponent<DeprecationCellProps> = ({
  headline,
  healthColor,
  correctiveAction,
  indexName,
  docUrl,
  items = [],
  children,
}) => (
  <div className="upgDeprecationCell">
    <EuiFlexGroup responsive={false} wrap alignItems="baseline">
      {healthColor && (
        <EuiFlexItem grow={false}>
          <EuiIcon type="dot" color={healthColor} />
        </EuiFlexItem>
      )}

      <EuiFlexItem grow>
        {headline && (
          <EuiTitle size="xxs">
            <h2>{headline}</h2>
          </EuiTitle>
        )}

        {items.map((item, index) => (
          <EuiText key={`deprecation-item-${index}`}>
            {item.title && <h6>{item.title}</h6>}
            <p>{item.body}</p>
          </EuiText>
        ))}

        {docUrl && (
          <>
            <EuiSpacer size="s" />

            <EuiLink href={docUrl} target="_blank">
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.deprecations.documentationButtonLabel"
                defaultMessage="Documentation"
              />
            </EuiLink>
          </>
        )}
      </EuiFlexItem>

      {correctiveAction && (
        <EuiFlexItem grow={false}>
          <CellAction correctiveAction={correctiveAction} indexName={indexName} items={items} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>

    <EuiSpacer size="s" />

    {children}
  </div>
);
