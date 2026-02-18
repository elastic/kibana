/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiButtonEmpty,
  EuiPanel,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import { type ServiceAdjacency, getReachableServices } from './use_service_map';

const PathSelectorContainer = styled('div')`
  position: absolute;
  top: ${({ theme }) => theme.euiTheme.size.s};
  right: ${({ theme }) => theme.euiTheme.size.base};
  z-index: 1;
  width: 420px;
`;

interface PathSelectorProps {
  serviceNames: string[];
  serviceAdjacency: ServiceAdjacency;
  originServiceName?: string;
  targetServiceName?: string;
  onOriginChange: (serviceName: string | undefined) => void;
  onTargetChange: (serviceName: string | undefined) => void;
}

export function PathSelector({
  serviceNames,
  serviceAdjacency,
  originServiceName,
  targetServiceName,
  onOriginChange,
  onTargetChange,
}: PathSelectorProps) {
  const originOptions: EuiComboBoxOptionOption[] = useMemo(
    () => serviceNames.map((name) => ({ label: name })),
    [serviceNames]
  );

  const destinationOptions: EuiComboBoxOptionOption[] = useMemo(() => {
    if (!originServiceName || serviceAdjacency.size === 0) {
      return serviceNames.map((name) => ({ label: name }));
    }
    const reachable = getReachableServices(serviceAdjacency, originServiceName);
    return serviceNames.filter((name) => reachable.has(name)).map((name) => ({ label: name }));
  }, [serviceNames, serviceAdjacency, originServiceName]);

  const selectedOrigin: EuiComboBoxOptionOption[] = originServiceName
    ? [{ label: originServiceName }]
    : [];

  const selectedTarget: EuiComboBoxOptionOption[] = targetServiceName
    ? [{ label: targetServiceName }]
    : [];

  const hasSelection = originServiceName || targetServiceName;

  return (
    <PathSelectorContainer>
      <EuiPanel hasShadow paddingSize="s">
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow>
            <EuiFormRow
              label={i18n.translate('xpack.apm.serviceMap.pathSelector.origin', {
                defaultMessage: 'Origin',
              })}
              compressed
              fullWidth
            >
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={originOptions}
                selectedOptions={selectedOrigin}
                onChange={(selected) => {
                  onOriginChange(selected.length > 0 ? selected[0].label : undefined);
                  // Clear destination if origin changes since reachability changes
                  onTargetChange(undefined);
                }}
                placeholder={i18n.translate('xpack.apm.serviceMap.pathSelector.originPlaceholder', {
                  defaultMessage: 'Select origin service',
                })}
                isClearable
                compressed
                fullWidth
                data-test-subj="serviceMapPathOrigin"
              />
            </EuiFormRow>
          </EuiFlexItem>

          <EuiFlexItem grow={false} style={{ alignSelf: 'flex-end', paddingBottom: 4 }}>
            <EuiIcon type="sortRight" aria-hidden={true} />
          </EuiFlexItem>

          <EuiFlexItem grow>
            <EuiFormRow
              label={i18n.translate('xpack.apm.serviceMap.pathSelector.destination', {
                defaultMessage: 'Destination',
              })}
              display="columnCompressed"
              fullWidth
            >
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={destinationOptions}
                selectedOptions={selectedTarget}
                onChange={(selected) => {
                  onTargetChange(selected.length > 0 ? selected[0].label : undefined);
                }}
                placeholder={i18n.translate(
                  'xpack.apm.serviceMap.pathSelector.destinationPlaceholder',
                  { defaultMessage: 'Select destination service' }
                )}
                isClearable
                compressed
                fullWidth
                data-test-subj="serviceMapPathDestination"
              />
            </EuiFormRow>
          </EuiFlexItem>

          {hasSelection && (
            <EuiFlexItem grow={false} style={{ alignSelf: 'flex-end', paddingBottom: 4 }}>
              <EuiButtonEmpty
                size="s"
                iconType="cross"
                onClick={() => {
                  onOriginChange(undefined);
                  onTargetChange(undefined);
                }}
                data-test-subj="serviceMapPathClear"
              >
                {i18n.translate('xpack.apm.serviceMap.pathSelector.clear', {
                  defaultMessage: 'Clear',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </PathSelectorContainer>
  );
}
