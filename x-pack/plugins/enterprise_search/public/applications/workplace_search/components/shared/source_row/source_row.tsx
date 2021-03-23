/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

// Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import _kebabCase from 'lodash/kebabCase';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSwitch,
  EuiSwitchEvent,
  EuiTableRow,
  EuiTableRowCell,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { EuiLinkTo } from '../../../../shared/react_router_helpers';
import { SOURCE_STATUSES as statuses } from '../../../constants';
import {
  ADD_SOURCE_PATH,
  SOURCE_DETAILS_PATH,
  getContentSourcePath,
  getSourcesPath,
} from '../../../routes';
import { ContentSourceDetails } from '../../../types';
import { SourceIcon } from '../source_icon';

const CREDENTIALS_INVALID_ERROR_REASON = 'credentials_invalid';

export interface ISourceRow {
  showDetails?: boolean;
  isOrganization?: boolean;
  onSearchableToggle?(sourceId: string, isSearchable: boolean): void;
}

interface SourceRowProps extends ISourceRow {
  source: ContentSourceDetails;
}

export const SourceRow: React.FC<SourceRowProps> = ({
  source: {
    id,
    serviceType,
    searchable,
    supportedByLicense,
    status,
    statusMessage,
    name,
    documentCount,
    isFederatedSource,
    errorReason,
    allowsReauth,
  },
  onSearchableToggle,
  isOrganization,
  showDetails,
}) => {
  const isIndexing = status === statuses.INDEXING;
  const hasError = status === statuses.ERROR || status === statuses.DISCONNECTED;
  const showFix =
    isOrganization && hasError && allowsReauth && errorReason === CREDENTIALS_INVALID_ERROR_REASON;

  const fixLink = (
    <EuiLinkTo
      to={getSourcesPath(
        `${ADD_SOURCE_PATH}/${_kebabCase(serviceType)}/re-authenticate?sourceId=${id}`,
        isOrganization
      )}
    >
      Fix
    </EuiLinkTo>
  );

  const remoteTooltip = (
    <>
      <span>Remote</span>
      <EuiToolTip
        position="top"
        content="Remote sources rely on the source's search service directly, and no content is indexed with Workplace Search. Speed and integrity of results are functions of the third-party service's health and performance."
      >
        <EuiIcon type="questionInCircle" />
      </EuiToolTip>
    </>
  );

  return (
    <EuiTableRow data-test-subj="GroupsRow">
      <EuiTableRowCell>
        <EuiFlexGroup
          justifyContent="flexStart"
          alignItems="center"
          gutterSize="xs"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <SourceIcon serviceType={isIndexing ? 'loadingSmall' : serviceType} name={name} />
          </EuiFlexItem>
          <EuiFlexItem>{name}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiTableRowCell>
      <EuiTableRowCell>
        <EuiFlexGroup
          justifyContent="flexStart"
          alignItems="center"
          responsive={false}
          gutterSize="xs"
        >
          {status === 'need-more-config' && (
            <EuiFlexItem grow={false}>
              <EuiIcon size="m" type="dot" color="warning" />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiText color={status === 'need-more-config' ? 'default' : 'subdued'} size="xs">
              {statusMessage}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTableRowCell>
      <EuiTableRowCell data-test-subj="SourceDocumentCount">
        {isFederatedSource ? remoteTooltip : parseInt(documentCount, 10).toLocaleString('en-US')}
      </EuiTableRowCell>
      {onSearchableToggle && (
        <EuiTableRowCell>
          <EuiSwitch
            checked={searchable}
            onChange={(e: EuiSwitchEvent) => onSearchableToggle(id, e.target.checked)}
            disabled={!supportedByLicense}
            compressed
            label="Source Searchable Toggle"
            showLabel={false}
            data-test-subj="SourceSearchableToggle"
          />
        </EuiTableRowCell>
      )}
      <EuiTableRowCell align="right">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s">
          {showFix && <EuiFlexItem grow={false}>{fixLink}</EuiFlexItem>}
          <EuiFlexItem grow={false}>
            {showDetails && (
              <EuiLinkTo
                className="eui-textNoWrap"
                data-test-subj="SourceDetailsLink"
                to={getContentSourcePath(SOURCE_DETAILS_PATH, id, !!isOrganization)}
              >
                Details
              </EuiLinkTo>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTableRowCell>
    </EuiTableRow>
  );
};
