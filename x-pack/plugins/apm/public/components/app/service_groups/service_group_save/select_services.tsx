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
import React, { useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { KueryBar } from '../../../shared/kuery_bar';
import { ServiceListPreview } from './service_list_preview';
import type { StagedServiceGroup } from './save_modal';
import { getDateRange } from '../../../../context/url_params_context/helpers';
import {
  validateServiceGroupKuery,
  isSupportedField,
} from '../../../../../common/service_groups';

const CentralizedContainer = styled.div`
  display: flex;
  height: 100%;
  justify-content: center;
  align-items: center;
`;

const MAX_CONTAINER_HEIGHT = 600;
const MODAL_HEADER_HEIGHT = 180;
const MODAL_FOOTER_HEIGHT = 80;

const Container = styled.div`
  width: 600px;
  height: ${MAX_CONTAINER_HEIGHT}px;
`;

interface Props {
  serviceGroup: StagedServiceGroup;
  isEdit?: boolean;
  onCloseModal: () => void;
  onSaveClick: (serviceGroup: StagedServiceGroup) => void;
  onEditGroupDetailsClick: () => void;
  isLoading: boolean;
}

export function SelectServices({
  serviceGroup,
  isEdit,
  onCloseModal,
  onSaveClick,
  onEditGroupDetailsClick,
  isLoading,
}: Props) {
  const [kuery, setKuery] = useState(serviceGroup?.kuery || '');
  const [stagedKuery, setStagedKuery] = useState(serviceGroup?.kuery || '');
  const [kueryValidationMessage, setKueryValidationMessage] = useState<
    string | undefined
  >();

  useEffect(() => {
    if (isEdit) {
      setKuery(serviceGroup.kuery);
      setStagedKuery(serviceGroup.kuery);
    }
  }, [isEdit, serviceGroup.kuery]);

  useEffect(() => {
    if (!stagedKuery) {
      return;
    }
    const { message } = validateServiceGroupKuery(stagedKuery);
    setKueryValidationMessage(message);
  }, [stagedKuery]);

  const { start, end } = useMemo(
    () =>
      getDateRange({
        rangeFrom: 'now-24h',
        rangeTo: 'now',
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kuery]
  );

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && !isEmpty(kuery)) {
        return callApmApi('GET /internal/apm/service-group/services', {
          params: { query: { kuery, start, end } },
        });
      }
    },
    [kuery, start, end],
    { preservePreviousData: true }
  );

  const isServiceListPreviewLoading = status === FETCH_STATUS.LOADING;

  return (
    <Container>
      <EuiModalHeader>
        <div>
          <EuiModalHeaderTitle>
            {i18n.translate(
              'xpack.apm.serviceGroups.selectServicesForm.title',
              {
                defaultMessage: 'Select services',
              }
            )}
          </EuiModalHeaderTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued" size="s">
            {i18n.translate(
              'xpack.apm.serviceGroups.selectServicesForm.subtitle',
              {
                defaultMessage:
                  'Use a query to select services for this group. The preview shows services that match this query within the last 24 hours.',
              }
            )}
          </EuiText>
          {kueryValidationMessage && (
            <EuiText color="danger" size="s">
              {kueryValidationMessage}
            </EuiText>
          )}
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <KueryBar
                placeholder={i18n.translate(
                  'xpack.apm.serviceGroups.selectServicesForm.kql',
                  { defaultMessage: 'E.g. labels.team: "web"' }
                )}
                onSubmit={(value) => {
                  setKuery(value);
                }}
                onChange={(value) => {
                  setStagedKuery(value);
                }}
                value={kuery}
                suggestionFilter={(querySuggestion) => {
                  if ('field' in querySuggestion) {
                    const {
                      field: {
                        spec: { name: fieldName },
                      },
                    } = querySuggestion;

                    return isSupportedField(fieldName);
                  }
                  return true;
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={() => {
                  setKuery(stagedKuery);
                }}
                iconType={!kuery ? 'search' : 'refresh'}
                isDisabled={isServiceListPreviewLoading || !stagedKuery}
              >
                {!kuery
                  ? i18n.translate(
                      'xpack.apm.serviceGroups.selectServicesForm.preview',
                      { defaultMessage: 'Preview' }
                    )
                  : i18n.translate(
                      'xpack.apm.serviceGroups.selectServicesForm.refresh',
                      { defaultMessage: 'Refresh' }
                    )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          {kuery && data?.items && (
            <EuiText color="success" size="s">
              {i18n.translate(
                'xpack.apm.serviceGroups.selectServicesForm.matchingServiceCount',
                {
                  defaultMessage:
                    '{servicesCount} {servicesCount, plural, =0 {services} one {service} other {services}} match the query',
                  values: { servicesCount: data?.items.length },
                }
              )}
            </EuiText>
          )}
        </div>
      </EuiModalHeader>
      <EuiModalBody
        style={{
          height: `calc(75vh - ${MODAL_HEADER_HEIGHT}px - ${MODAL_FOOTER_HEIGHT}px)`,
          maxHeight:
            MAX_CONTAINER_HEIGHT - MODAL_HEADER_HEIGHT - MODAL_FOOTER_HEIGHT,
        }}
      >
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          style={{ height: '100%' }}
        >
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder paddingSize="s">
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
              {!data && isServiceListPreviewLoading && (
                <CentralizedContainer>
                  <EuiLoadingSpinner />
                </CentralizedContainer>
              )}
              {kuery && data && (
                <ServiceListPreview
                  items={data.items}
                  isLoading={isServiceListPreviewLoading}
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
                isDisabled={isLoading}
              >
                {i18n.translate(
                  'xpack.apm.serviceGroups.selectServicesForm.editGroupDetails',
                  { defaultMessage: 'Edit group details' }
                )}
              </EuiButton>
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCloseModal} isDisabled={isLoading}>
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
              onClick={() => {
                onSaveClick({ ...serviceGroup, kuery });
              }}
              isDisabled={isLoading || !kuery}
            >
              {i18n.translate(
                'xpack.apm.serviceGroups.selectServicesForm.saveGroup',
                { defaultMessage: 'Save group' }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </Container>
  );
}
