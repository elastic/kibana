/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import classNames from 'classnames';
// Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import _kebabCase from 'lodash/kebabCase';
import { Link } from 'react-router-dom';

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

import { SOURCE_STATUSES as statuses } from '../../../constants';
import { IContentSourceDetails } from '../../../types';
import { ADD_SOURCE_PATH, SOURCE_DETAILS_PATH, getContentSourcePath } from '../../../routes';

import { SourceIcon } from '../source_icon';

const CREDENTIALS_INVALID_ERROR_REASON = 1;

export interface ISourceRow {
  showDetails?: boolean;
  isOrganization?: boolean;
  onSearchableToggle?(sourceId: string, isSearchable: boolean): void;
}

interface ISourceRowProps extends ISourceRow {
  source: IContentSourceDetails;
}

export const SourceRow: React.FC<ISourceRowProps> = ({
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

  const rowClass = classNames(
    'source-row',
    { 'content-section--disabled': !searchable },
    { 'source-row source-row--error': hasError }
  );

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const imageClass = classNames('source-row__icon', { 'source-row__icon--loading': isIndexing });

  const fixLink = (
    <Link
      to={{
        pathname: `${ADD_SOURCE_PATH}/${_kebabCase(serviceType)}/re-authenticate`,
        search: `?sourceId=${id}`,
      }}
    >
      Fix
    </Link>
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
    <EuiTableRow data-test-subj="GroupsRow" className={rowClass}>
      <EuiTableRowCell>
        <EuiFlexGroup justifyContent="flexStart" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <SourceIcon
              serviceType={isIndexing ? 'loadingSmall' : serviceType}
              name={name}
              className={imageClass}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <span className="source-row__name">{name}</span>
          </EuiFlexItem>
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
            <EuiText
              className={`source-row__status source-row__status--${status}`}
              color={status === 'need-more-config' ? 'default' : 'subdued'}
              size="xs"
            >
              {statusMessage}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTableRowCell>
      <EuiTableRowCell className="source-row__document-count" data-test-subj="SourceDocumentCount">
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
      <EuiTableRowCell className="source-row__actions">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s">
          {showFix && <EuiFlexItem grow={false}>{fixLink}</EuiFlexItem>}
          <EuiFlexItem grow={false}>
            {showDetails && (
              <Link
                className="eui-textNoWrap"
                data-test-subj="SourceDetailsLink"
                to={getContentSourcePath(SOURCE_DETAILS_PATH, id, !!isOrganization)}
              >
                Details
              </Link>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTableRowCell>
    </EuiTableRow>
  );
};
