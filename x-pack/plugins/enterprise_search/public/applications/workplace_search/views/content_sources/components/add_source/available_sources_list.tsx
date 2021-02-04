/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { useValues } from 'kea';

import { LicensingLogic } from '../../../../../shared/licensing';
import { EuiLinkTo } from '../../../../../shared/react_router_helpers';

import { SourceIcon } from '../../../../components/shared/source_icon';
import { SourceDataItem } from '../../../../types';
import { ADD_CUSTOM_PATH, getSourcesPath } from '../../../../routes';

import {
  AVAILABLE_SOURCE_EMPTY_STATE,
  AVAILABLE_SOURCE_TITLE,
  AVAILABLE_SOURCE_BODY,
  AVAILABLE_SOURCE_CUSTOM_SOURCE_BUTTON,
} from './constants';

interface AvailableSourcesListProps {
  sources: SourceDataItem[];
}

export const AvailableSourcesList: React.FC<AvailableSourcesListProps> = ({ sources }) => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const getSourceCard = ({ name, serviceType, addPath, accountContextOnly }: SourceDataItem) => {
    const disabled = !hasPlatinumLicense && accountContextOnly;
    const card = (
      <EuiCard
        titleSize="xs"
        title={name}
        description={<></>}
        isDisabled={disabled}
        icon={
          <SourceIcon
            serviceType={serviceType}
            name={name}
            className="euiIcon--xxxLarge source-card-icon"
          />
        }
      />
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
          {card}
        </EuiToolTip>
      );
    }
    return <EuiLinkTo to={getSourcesPath(addPath, true)}>{card}</EuiLinkTo>;
  };

  const visibleSources = (
    <EuiFlexGrid columns={3} gutterSize="m" className="source-grid" responsive={false}>
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
        <h2>{AVAILABLE_SOURCE_TITLE}</h2>
      </EuiTitle>
      <EuiText>
        <p>
          {AVAILABLE_SOURCE_BODY}
          <EuiLinkTo
            to={getSourcesPath(ADD_CUSTOM_PATH, true)}
            data-test-subj="CustomAPISourceLink"
          >
            {AVAILABLE_SOURCE_CUSTOM_SOURCE_BUTTON}
          </EuiLinkTo>
          .
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      {sources.length > 0 ? visibleSources : emptyState}
    </>
  );
};
