/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { useAnyOfApmParams } from '../../../../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../../../hooks/use_time_range';
import { KueryBar } from '../../../../../shared/kuery_bar';
import { ServiceList } from './service_list';
import type { SelectServices as SelectServicesType } from '../';

const CentralizedContainer = styled.div`
  display: flex;
  height: 100%;
  justify-content: center;
  align-items: center;
`;

interface Props {
  onCloseModal: () => void;
  onSaveClick: (selectService: SelectServicesType) => void;
  onEditGroupDetailsClick: () => void;
}

export function SelectServices({
  onCloseModal,
  onSaveClick,
  onEditGroupDetailsClick,
}: Props) {
  const {
    query: { environment, kuery },
  } = useAnyOfApmParams('/services');

  const { start, end, refreshTimeRange } = useTimeRange({
    rangeFrom: 'now-24h',
    rangeTo: 'now',
  });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && kuery) {
        return callApmApi({
          endpoint: 'GET /internal/apm/services',
          params: {
            query: { environment, kuery, start, end },
          },
        });
      }
    },
    [environment, kuery, start, end]
  );

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>
            {i18n.translate(
              'xpack.apm.serviceGroups.selectServicesForm.title',
              { defaultMessage: 'Select services' }
            )}
          </h1>
          <EuiSpacer size="s" />
          <EuiText color="subdued" size="s">
            {i18n.translate(
              'xpack.apm.serviceGroups.selectServicesForm.subtitle',
              {
                defaultMessage:
                  'Use a query to select services for this group. Services that match this query will automatically be added to the group.',
              }
            )}
          </EuiText>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <KueryBar
                  placeholder={i18n.translate(
                    'xpack.apm.serviceGroups.selectServicesForm.kql',
                    { defaultMessage: 'E.g. labels.team: "web"' }
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={refreshTimeRange}
                  iconType="refresh"
                  isDisabled={!kuery}
                >
                  {i18n.translate(
                    'xpack.apm.serviceGroups.selectServicesForm.refresh',
                    { defaultMessage: 'Refresh' }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel
              hasShadow={false}
              hasBorder
              paddingSize="s"
              style={{ height: 300 }}
            >
              {!kuery && (
                <CentralizedContainer>
                  <EuiText size="s" color="subdued">
                    {i18n.translate(
                      'xpack.apm.serviceGroups.selectServicesForm.panelLabel',
                      { defaultMessage: 'Enter a query to select services' }
                    )}
                  </EuiText>
                </CentralizedContainer>
              )}
              {!data && status === FETCH_STATUS.LOADING && (
                <CentralizedContainer>
                  <EuiLoadingSpinner />
                </CentralizedContainer>
              )}
              {kuery && data && (
                <ServiceList
                  items={data.items}
                  isLoading={status === FETCH_STATUS.LOADING}
                />
              )}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup>
          <EuiFlexItem>
            <div>
              <EuiButton
                color="text"
                onClick={onEditGroupDetailsClick}
                iconType="sortLeft"
              >
                {i18n.translate(
                  'xpack.apm.serviceGroups.selectServicesForm.editGroupDetails',
                  { defaultMessage: 'Edit group details' }
                )}
              </EuiButton>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCloseModal}>
              {i18n.translate(
                'xpack.apm.serviceGroups.selectServicesForm.cancel',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="sortRight"
              iconSide="right"
              onClick={() => {
                onSaveClick({ kql: kuery });
              }}
              isDisabled={!kuery}
            >
              {i18n.translate(
                'xpack.apm.serviceGroups.selectServicesForm.saveGroup',
                { defaultMessage: 'Save group' }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );
}
