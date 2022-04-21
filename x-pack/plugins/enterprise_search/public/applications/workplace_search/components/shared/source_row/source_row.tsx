/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import classNames from 'classnames';

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

import './source_row.scss';

import {
  SOURCE_ROW_REAUTHENTICATE_STATUS_LINK_LABEL,
  SOURCE_ROW_REMOTE_LABEL,
  SOURCE_ROW_REMOTE_TOOLTIP,
  SOURCE_ROW_SEARCHABLE_TOGGLE_LABEL,
  SOURCE_ROW_DETAILS_LABEL,
} from './constants';

// i18n is not needed here because this is only used to check against the server error, which
// is not translated by the Kibana team at this time.
const CREDENTIALS_REFRESH_NEEDED_PREFIX = 'OAuth access token could not be refreshed';

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
    baseServiceType,
    searchable,
    supportedByLicense,
    status,
    statusMessage,
    name,
    documentCount,
    isFederatedSource,
    errorReason,
    allowsReauth,
    activities,
    mainIcon,
  },
  onSearchableToggle,
  isOrganization,
  showDetails,
}) => {
  const isIndexing = status === statuses.INDEXING;
  const hasError = status === statuses.ERROR || status === statuses.DISCONNECTED;
  const showReauthenticate =
    hasError &&
    allowsReauth &&
    errorReason?.startsWith(CREDENTIALS_REFRESH_NEEDED_PREFIX) &&
    activities[0]?.status?.toLowerCase() === statuses.ERROR;

  const rowClass = classNames({ 'source-row--error': hasError });

  const reauthenticateLink = (
    <EuiLinkTo
      to={getSourcesPath(
        `${ADD_SOURCE_PATH}/${serviceType}/reauthenticate?sourceId=${id}`,
        isOrganization
      )}
    >
      {SOURCE_ROW_REAUTHENTICATE_STATUS_LINK_LABEL}
    </EuiLinkTo>
  );

  const remoteTooltip = (
    <>
      <span>{SOURCE_ROW_REMOTE_LABEL}</span>
      <EuiToolTip position="top" content={SOURCE_ROW_REMOTE_TOOLTIP}>
        <EuiIcon type="questionInCircle" />
      </EuiToolTip>
    </>
  );

  return (
    <EuiTableRow data-test-subj="GroupsRow" className={rowClass}>
      <EuiTableRowCell>
        <EuiFlexGroup
          justifyContent="flexStart"
          alignItems="center"
          gutterSize="m"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <SourceIcon
              serviceType={isIndexing ? 'loadingSmall' : baseServiceType || serviceType}
              name={name}
              iconAsBase64={mainIcon}
            />
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
            label={SOURCE_ROW_SEARCHABLE_TOGGLE_LABEL}
            showLabel={false}
            data-test-subj="SourceSearchableToggle"
          />
        </EuiTableRowCell>
      )}
      <EuiTableRowCell align="right">
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s">
          {showReauthenticate && <EuiFlexItem grow={false}>{reauthenticateLink}</EuiFlexItem>}
          <EuiFlexItem grow={false}>
            {showDetails && (
              <EuiLinkTo
                className="eui-textNoWrap"
                data-test-subj="SourceDetailsLink"
                to={getContentSourcePath(SOURCE_DETAILS_PATH, id, !!isOrganization)}
              >
                {SOURCE_ROW_DETAILS_LABEL}
              </EuiLinkTo>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTableRowCell>
    </EuiTableRow>
  );
};
