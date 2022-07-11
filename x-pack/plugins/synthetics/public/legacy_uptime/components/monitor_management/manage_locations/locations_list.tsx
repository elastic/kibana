/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiAccordion,
  EuiText,
  EuiTextColor,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonIcon,
  EuiLink,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { useLocationMonitors } from './hooks/use_location_monitors';
import { PrivateLocation } from '../../../../../common/runtime_types';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';
import { LocationForm } from './location_form';
import { selectAgentPolicies } from '../../../state/private_locations';

export const PrivateLocationsList = ({
  privateLocations,
  onSubmit,
  loading,
  onDelete,
}: {
  privateLocations: PrivateLocation[];
  loading: boolean;
  onSubmit: (location: PrivateLocation) => void;
  onDelete: (id: string) => void;
}) => {
  const { basePath } = useUptimeSettingsContext();

  const { data: policies } = useSelector(selectAgentPolicies);

  const { locations } = useLocationMonitors();

  if (loading) {
    return <EuiLoadingSpinner />;
  }

  return (
    <Wrapper>
      {privateLocations.map((location) => {
        const monCount = locations?.find((l) => l.id === location.id)?.count ?? 0;
        const canDelete = monCount === 0;
        const policy = policies?.items.find((policyT) => policyT.id === location.policyHostId);
        return (
          <div key={location.id}>
            <EuiAccordion
              id={location.id}
              element="fieldset"
              className="euiAccordionForm"
              buttonClassName="euiAccordionForm__button"
              buttonContent={
                <div>
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="visMapCoordinate" size="m" />
                    </EuiFlexItem>

                    <EuiFlexItem>
                      <EuiTitle size="xs" className="eui-textNoWrap">
                        <h3>{location.name}</h3>
                      </EuiTitle>
                    </EuiFlexItem>

                    <EuiFlexItem>
                      <EuiText size="xs">
                        <EuiTextColor color="subdued">Running monitors: {monCount}</EuiTextColor>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiText size="s">
                    <p>
                      <EuiTextColor color="subdued">
                        Host policy:{' '}
                        {policy ? (
                          <EuiLink href={`${basePath}/app/fleet/policies/${location.policyHostId}`}>
                            {policy?.name}
                          </EuiLink>
                        ) : (
                          <EuiText color="danger" size="s" className="eui-displayInline">
                            Policy is deleted
                          </EuiText>
                        )}
                      </EuiTextColor>
                    </p>
                  </EuiText>
                </div>
              }
              extraAction={
                <EuiToolTip
                  title={
                    canDelete
                      ? 'Delete location'
                      : `it can't be deleted, because it has ${monCount} monitors running. Please delete them before you can delete this location`
                  }
                >
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    aria-label="Delete"
                    onClick={() => onDelete(location.id)}
                    isDisabled={!canDelete}
                  />
                </EuiToolTip>
              }
              paddingSize="l"
            >
              <LocationForm onSubmit={onSubmit} loading={loading} location={location} />
            </EuiAccordion>
            <EuiSpacer />
          </div>
        );
      })}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  &&& {
    .euiAccordion__button {
      text-decoration: none;
    }
  }
`;
