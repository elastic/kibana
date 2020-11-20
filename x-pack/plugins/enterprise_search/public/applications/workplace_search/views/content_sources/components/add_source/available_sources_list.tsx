/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Link } from 'react-router-dom';

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

import { LicensingLogic } from '../../../../../../applications/shared/licensing';

import { SourceIcon } from '../../../../components/shared/source_icon';
import { SourceDataItem } from '../../../../types';
import { ADD_CUSTOM_PATH, getSourcesPath } from '../../../../routes';

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
          content={`${name} is configurable as a Private Source, available with a Platinum subscription.`}
        >
          {card}
        </EuiToolTip>
      );
    }
    return <Link to={getSourcesPath(addPath, true)}>{card}</Link>;
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

  const emptyState = <p>No available sources matching your query.</p>;

  return (
    <>
      <EuiTitle size="s">
        <h2>Available for configuration</h2>
      </EuiTitle>
      <EuiText>
        <p>
          Configure an available source or build your own with the{' '}
          <Link to={getSourcesPath(ADD_CUSTOM_PATH, true)} data-test-subj="CustomAPISourceLink">
            Custom API Source
          </Link>
          .
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      {sources.length > 0 ? visibleSources : emptyState}
    </>
  );
};
