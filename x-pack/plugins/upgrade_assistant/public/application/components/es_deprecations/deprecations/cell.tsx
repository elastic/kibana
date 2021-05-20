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
import { EnrichedDeprecationInfo } from '../../../../../common/types';
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

      {correctiveAction?.type === 'mlSnapshot' && (
        <EuiFlexItem grow={false}>
          <FixMlSnapshotsButton
            jobId={correctiveAction.jobId}
            snapshotId={correctiveAction.snapshotId}
            // There will only ever be a single item for the cluster deprecations list, so we can use the index to access the first one
            description={items[0]?.body}
          />
        </EuiFlexItem>
      )}

      {correctiveAction?.type === 'reindex' && (
        <EuiFlexItem grow={false}>
          <AppContext.Consumer>
            {({ http, docLinks }) => (
              <ReindexButton
                docLinks={docLinks}
                reindexBlocker={correctiveAction.blockerForReindexing}
                indexName={indexName!}
                http={http}
              />
            )}
          </AppContext.Consumer>
        </EuiFlexItem>
      )}

      {correctiveAction?.type === 'indexSetting' && (
        <EuiFlexItem grow={false}>
          <FixIndexSettingsButton
            settings={correctiveAction.deprecatedSettings}
            index={indexName!}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>

    <EuiSpacer size="s" />

    {children}
  </div>
);
