/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

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
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
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
  hasFleetPermissions,
}: {
  loading: boolean;
  privateLocations: PrivateLocation[];
  hasFleetPermissions: boolean;
  onSubmit: (location: PrivateLocation) => void;
  onDelete: (id: string) => void;
}) => {
  const { basePath } = useUptimeSettingsContext();

  const { data: policies } = useSelector(selectAgentPolicies);

  const { locations } = useLocationMonitors();

  const [openLocationMap, setOpenLocationMap] = useState<Record<string, boolean>>({});

  const canSave: boolean = !!useKibana().services?.application?.capabilities.uptime.save;

  if (loading) {
    return <EuiLoadingSpinner />;
  }

  return (
    <Wrapper>
      {privateLocations.map((location, index) => {
        const monCount = locations?.find((l) => l.id === location.id)?.count ?? 0;
        const canDelete = monCount === 0 || !hasFleetPermissions;
        const policy = policies?.items.find((policyT) => policyT.id === location.policyHostId);
        return (
          <div key={location.id}>
            <EuiAccordion
              data-test-subj={`location-accordion-` + index}
              id={location.id}
              element="fieldset"
              className="euiAccordionForm"
              buttonClassName="euiAccordionForm__button"
              onToggle={(val) => {
                setOpenLocationMap((prevState) => ({ [location.id]: val, ...prevState }));
              }}
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
                        <EuiTextColor color="subdued">
                          {RUNNING_MONITORS}: {monCount}
                        </EuiTextColor>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiText size="s">
                    <p>
                      {hasFleetPermissions && (
                        <EuiTextColor color="subdued">
                          {AGENT_POLICY_LABEL}:{' '}
                          {policy ? (
                            <EuiLink
                              href={`${basePath}/app/fleet/policies/${location.policyHostId}`}
                            >
                              {policy?.name}
                            </EuiLink>
                          ) : (
                            <EuiText color="danger" size="s" className="eui-displayInline">
                              {POLICY_IS_DELETED}
                            </EuiText>
                          )}
                        </EuiTextColor>
                      )}
                    </p>
                  </EuiText>
                </div>
              }
              extraAction={
                <EuiToolTip
                  content={
                    canDelete
                      ? DELETE_LABEL
                      : i18n.translate('xpack.synthetics.monitorManagement.cannotDelete', {
                          defaultMessage: `This location cannot be deleted, because it has {monCount} monitors running. Please remove this location from your monitors before deleting this location.`,
                          values: { monCount },
                        })
                  }
                >
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    aria-label={DELETE_LABEL}
                    onClick={() => onDelete(location.id)}
                    isDisabled={!canDelete || !canSave}
                  />
                </EuiToolTip>
              }
              paddingSize="l"
            >
              {openLocationMap[location.id] && (
                <LocationForm
                  onSubmit={onSubmit}
                  loading={loading}
                  location={location}
                  privateLocations={privateLocations}
                />
              )}
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

const DELETE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.delete', {
  defaultMessage: 'Delete location',
});

const RUNNING_MONITORS = i18n.translate('xpack.synthetics.monitorManagement.runningMonitors', {
  defaultMessage: 'Running monitors',
});

const POLICY_IS_DELETED = i18n.translate('xpack.synthetics.monitorManagement.deletedPolicy', {
  defaultMessage: 'Policy is deleted',
});

const AGENT_POLICY_LABEL = i18n.translate('xpack.synthetics.monitorManagement.agentPolicy', {
  defaultMessage: 'Agent Policy',
});
