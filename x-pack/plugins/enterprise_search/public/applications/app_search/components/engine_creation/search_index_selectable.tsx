/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { HealthStatus } from '@elastic/elasticsearch/lib/api/types';

import {
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiToolTip,
  EuiBadge,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import './engine_creation.scss';
import { healthColorsMapSelectable } from '../../../shared/constants/health_colors';

export interface SearchIndexSelectableOption {
  label: string;
  health?: HealthStatus;
  status?: string;
  alias: boolean;
  badge: {
    color: string;
    icon?: string;
    label: string;
    toolTipTitle: string;
    toolTipContent: string;
  };
  disabled: boolean;
  total: {
    docs: {
      count: number;
      deleted: number;
    };
    store: {
      size_in_bytes: string;
    };
  };
  checked?: 'on';
  count: number;
}
interface IndexStatusDetailsProps {
  option?: SearchIndexSelectableOption;
}

export const IndexStatusDetails: React.FC<IndexStatusDetailsProps> = ({ option }) => {
  return !option ? (
    <></>
  ) : (
    <EuiFlexGroup className="entSearch__indexListItem" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiHealth color={option.health ? healthColorsMapSelectable[option.health] : ''}>
          {option.health ?? '-'}
        </EuiHealth>
      </EuiFlexItem>
      <EuiFlexItem grow={false} data-test-subj="optionStatus">
        <span>
          <b>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.elasticsearchIndex.status',
              { defaultMessage: 'Status' }
            )}
          </b>
          :<EuiTextColor color="subdued">&nbsp;{option.status ?? '-'}</EuiTextColor>
        </span>
      </EuiFlexItem>
      <EuiFlexItem grow={false} data-test-subj="optionDocs">
        <span>
          <b>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.elasticsearchIndex.docCount',
              { defaultMessage: 'Docs count' }
            )}
          </b>
          :<EuiTextColor color="subdued">&nbsp;{option.count ?? '-'}</EuiTextColor>
        </span>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj="optionStorage">
        <span>
          <b>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.elasticsearchIndex.storage',
              { defaultMessage: 'Storage size' }
            )}
          </b>
          :
          <EuiTextColor color="subdued">
            &nbsp;{option.total?.store?.size_in_bytes ?? '-'}
          </EuiTextColor>
        </span>
      </EuiFlexItem>
      <EuiFlexItem grow={false} data-test-subj="optionStorage">
        <EuiBadge color={option.badge.color} iconType={option.badge.icon}>
          <EuiToolTip
            position="left"
            title={option.badge.toolTipTitle}
            content={option.badge.toolTipContent}
          >
            <p>{option.badge.label}</p>
          </EuiToolTip>
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
