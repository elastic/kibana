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
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiToolTip,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { LicensingLogic } from '../../../../../shared/licensing';
import { EuiButtonEmptyTo, EuiLinkTo } from '../../../../../shared/react_router_helpers';
import { SourceIcon } from '../../../../components/shared/source_icon';
import { ADD_CUSTOM_PATH, getAddPath, getSourcesPath } from '../../../../routes';
import { SourceDataItem } from '../../../../types';

import { staticCustomSourceData } from '../../source_data';

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

  const getSourceCard = ({
    accountContextOnly,
    baseServiceType,
    name,
    serviceType,
  }: SourceDataItem) => {
    const addPath = getAddPath(serviceType, baseServiceType);
    const disabled = !hasPlatinumLicense && accountContextOnly;

    const connectButton = () => {
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
            <EuiButtonEmpty disabled>Connect</EuiButtonEmpty>
          </EuiToolTip>
        );
      } else {
        return (
          <EuiButtonEmptyTo
            to={
              getSourcesPath(addPath, true) +
              (serviceType !== 'external' && serviceType !== 'custom' ? '/intro' : '')
            }
          >
            Connect
          </EuiButtonEmptyTo>
        );
      }
    };

    const card = (
      <>
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="m">
          <EuiFlexItem grow={false}>
            <SourceIcon serviceType={baseServiceType || serviceType} name={name} size="l" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="m">{name}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{connectButton()}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiHorizontalRule size="full" margin="none" />
      </>
    );

    return card;
  };

  const visibleSources = (
    <>
      <EuiFlexGrid columns={2} direction="column" gutterSize="l">
        {sources.map((source, i) => (
          <EuiFlexItem grow={false} key={i} data-test-subj="AvailableSourceListItem">
            <EuiFlexGroup
              justifyContent="center"
              alignItems="stretch"
              data-test-subj="AvailableSourceCard"
            >
              <EuiFlexItem>{getSourceCard(source)}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
        <EuiFlexItem grow={false} data-test-subj="AvailableSourceListItem">
          <EuiFlexGroup
            justifyContent="center"
            alignItems="stretch"
            data-test-subj="AvailableSourceCard"
          >
            <EuiFlexItem>{getSourceCard(staticCustomSourceData)}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGrid>
    </>
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
