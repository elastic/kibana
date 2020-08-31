/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { ReindexButton } from './reindex';
import { AppContext } from '../../../../app_context';
import { EnrichedDeprecationInfo } from '../../../../../../common/types';

interface DeprecationCellProps {
  items?: Array<{ title?: string; body: string }>;
  reindexIndexName?: string;
  docUrl?: string;
  headline?: string;
  healthColor?: string;
  children?: ReactNode;
  reindexBlocker?: EnrichedDeprecationInfo['blockerForReindexing'];
}

/**
 * Used to display a deprecation with links to docs, a health indicator, and other descriptive information.
 */
export const DeprecationCell: FunctionComponent<DeprecationCellProps> = ({
  headline,
  healthColor,
  reindexIndexName,
  docUrl,
  items = [],
  children,
  reindexBlocker,
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

        {docUrl && (
          <div>
            <EuiLink href={docUrl} target="_blank">
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.deprecations.documentationButtonLabel"
                defaultMessage="Documentation"
              />
            </EuiLink>
            <EuiSpacer size="s" />
          </div>
        )}

        {items.map((item) => (
          <div key={item.title || item.body}>
            <EuiText>
              {item.title && <h6>{item.title}</h6>}
              <p>{item.body}</p>
            </EuiText>
          </div>
        ))}
      </EuiFlexItem>

      {reindexIndexName && (
        <EuiFlexItem grow={false}>
          <AppContext.Consumer>
            {({ http, docLinks }) => (
              <ReindexButton
                docLinks={docLinks}
                reindexBlocker={reindexBlocker}
                indexName={reindexIndexName}
                http={http}
              />
            )}
          </AppContext.Consumer>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>

    <EuiSpacer size="s" />

    {children}
  </div>
);
