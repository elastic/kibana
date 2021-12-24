/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiListGroup,
  EuiListGroupItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { LicensingLogic } from '../../../../../shared/licensing';
import { EuiLinkTo } from '../../../../../shared/react_router_helpers';
import { SourceIcon } from '../../../../components/shared/source_icon';
import { ADD_CUSTOM_PATH, getSourcesPath } from '../../../../routes';
import { SourceDataItem } from '../../../../types';

import {
  AVAILABLE_SOURCE_EMPTY_STATE,
  AVAILABLE_SOURCE_TITLE,
  AVAILABLE_SOURCE_BODY,
  AVAILABLE_SOURCE_CUSTOM_SOURCE_BUTTON,
} from './constants';

interface AvailableSourcesListProps {
  sources: SourceDataItem[];
}

const columnStyle = {
  columnCount: "2",
  columnGap: "2em"
}

export const AvailableSourcesList: React.FC<AvailableSourcesListProps> = ({ sources }) => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const getSourceCard = ({ name, serviceType, addPath, accountContextOnly }: SourceDataItem) => {

    const disabled = !hasPlatinumLicense && accountContextOnly;

    // TODO
    // does this card need a disabled state?
    const card = (
      <>
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          responsive={false}
          gutterSize="m"
        >
          <EuiFlexItem grow={false}>
            <SourceIcon serviceType={serviceType} name={name} size="l" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              {name}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText textAlign="right">
              <EuiLinkTo to={getSourcesPath(addPath, true)}>Connect</EuiLinkTo>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule size="full" margin="s" />
      </>
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

    // return <EuiLinkTo to={getSourcesPath(addPath, true)}>{card}</EuiLinkTo>;
    return card;
  };

  const visibleSources = (
    // TODO probably should be using something other than a div here
    <div style={columnStyle}>
      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        responsive={false}
        gutterSize="none"
      >
      </EuiFlexGroup>

      {sources.map((source, i) => (
        <EuiFlexItem grow={false} key={i}>
          <EuiFlexGroup
            justifyContent="center"
            alignItems="stretch"
            data-test-subj="AvailableSourceCard"
          >
            <EuiFlexItem>
              {getSourceCard(source)}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}

    </div>
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
