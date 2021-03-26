/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { LicensingLogic } from '../../../../../shared/licensing';
import { EuiLinkTo } from '../../../../../shared/react_router_helpers';
import { SourceIcon } from '../../../../components/shared/source_icon';
import { getSourcesPath } from '../../../../routes';
import { SourceDataItem } from '../../../../types';

import {
  AVAILABLE_SOURCE_EMPTY_STATE,
  AVAILABLE_SOURCE_TITLE,
} from './constants';

interface AvailableSourcesListProps {
  sources: SourceDataItem[];
}

export const AvailableSourcesList: React.FC<AvailableSourcesListProps> = ({ sources }) => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const getSourceCard = ({ name, serviceType, addPath, accountContextOnly }: SourceDataItem) => {
    const disabled = !hasPlatinumLicense && accountContextOnly;
    const item = (
      <EuiPanel color="subdued" hasShadow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <SourceIcon serviceType={serviceType} name={name} size="l" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s"><p>{name}</p></EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLinkTo to={getSourcesPath(addPath, true)}>Configure</EuiLinkTo>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );

    if (disabled) {
      return (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.contentSource.availableSourceList.toolTipContent',
            {
              defaultMessage:
                '{name} is configurable as a Private Source, available with a Platinum subscription.',
              values: { name },
            }
          )}
        >
          {item}
        </EuiToolTip>
      );
    }
    return item;
  };

  const visibleSources = (
    <EuiFlexGrid columns={2} gutterSize="m">
      {sources.map((source, i) => (
        <EuiFlexItem key={i} data-test-subj="AvailableSourceCard">
          {getSourceCard(source)}
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );

  const emptyState = (
    <p data-test-subj="AvailableSourceEmptyState">{AVAILABLE_SOURCE_EMPTY_STATE}</p>
  );

  return (
    <>
      <EuiTitle size="s">
        <h3>{AVAILABLE_SOURCE_TITLE}</h3>
      </EuiTitle>
      <EuiSpacer size="l" />
      {sources.length > 0 ? visibleSources : emptyState}
    </>
  );
};
