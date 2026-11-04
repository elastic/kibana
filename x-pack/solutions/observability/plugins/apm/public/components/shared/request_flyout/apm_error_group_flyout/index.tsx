/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import { Timestamp } from '@kbn/apm-ui-shared';
import React, { useMemo, useState } from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import {
  ENVIRONMENT_NOT_DEFINED,
  getEnvironmentLabel,
} from '../../../../../common/environment_filter_values';
import { getTimestampUs } from '../../../../../common/utils/get_timestamp_us';
import { FETCH_STATUS, isPending } from '../../../../hooks/use_fetcher';
import { useRequestFlyoutFetcher } from '../use_request_flyout_fetcher';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { ErrorSampleDetailTabContent } from '../../../app/error_group_details/error_sampler/error_sample_detail';
import { getTabs } from '../../../app/error_group_details/error_sampler/error_tabs';
import { SampleSummary } from '../../../app/error_group_details/error_sampler/sample_summary';
import { REQUEST_FLYOUT_EBT_ACTIONS, REQUEST_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { ACTIONS_BUTTON_LABEL, useLinksMenuPanels } from '../footer';
import { useRequestFlyoutContext } from '../request_flyout_context';

interface Props {
  serviceName: string;
  groupId: string;
  groupName: string;
  historyKey: symbol;
  onClose: () => void;
  /** Overrides the map's environment: the target of a server failure may run in another one. */
  environment?: string;
}

/**
 * Child flyout with the content of an APM error group: its samples, the sample summary and the
 * stack trace / metadata tabs, composed from the route-free pieces of the errors page.
 */
export function RequestFlyoutApmErrorGroupFlyout({
  serviceName,
  groupId,
  groupName,
  historyKey,
  onClose,
  environment: environmentOverride,
}: Props) {
  const {
    filters: { environment: mapEnvironment, start, end, rangeFrom, rangeTo },
  } = useRequestFlyoutContext();
  const environment = environmentOverride ?? mapEnvironment;
  const { link } = useApmRouter();

  const [samplePage, setSamplePage] = useState(0);
  const [activeTabKey, setActiveTabKey] = useState<string | undefined>();

  const { data: samples, status: samplesStatus } = useRequestFlyoutFetcher(
    (callApmApi) =>
      callApmApi('GET /internal/apm/services/{serviceName}/errors/{groupId}/samples', {
        params: {
          path: { serviceName, groupId },
          query: { environment, start, end, kuery: '' },
        },
      }),
    [serviceName, groupId, environment, start, end]
  );

  const errorSampleIds = samples?.errorSampleIds ?? [];
  const errorId = errorSampleIds[samplePage];

  const { data: errorData, status: errorStatus } = useRequestFlyoutFetcher(
    (callApmApi) => {
      if (!errorId) return;
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}',
        {
          params: {
            path: { serviceName, groupId, errorId },
            query: { environment, start, end, kuery: '' },
          },
        }
      );
    },
    [serviceName, groupId, errorId, environment, start, end]
  );

  // Without a sample id the error fetch never starts and its status stays pending forever.
  const isLoading = isPending(samplesStatus) || (errorId != null && isPending(errorStatus));
  const hasError = samplesStatus === FETCH_STATUS.FAILURE || errorStatus === FETCH_STATUS.FAILURE;
  const error = errorData?.error;
  const transaction = errorData?.transaction;

  const tabs = error ? getTabs(error) : [];
  const currentTab = tabs.find(({ key }) => key === activeTabKey) ?? tabs[0];

  const exception = error?.error?.exception?.[0];
  const errorEnvironment =
    error?.service?.environment ??
    transaction?.service?.environment ??
    ENVIRONMENT_NOT_DEFINED.value;
  const sdkLabel = [error?.agent?.name, error?.agent?.version].filter(Boolean).join(' ');

  const errorPageHref = link('/services/{serviceName}/errors/{groupId}', {
    path: { serviceName, groupId },
    query: {
      environment,
      rangeFrom,
      rangeTo,
      kuery: '',
      serviceGroup: '',
      comparisonEnabled: false,
    },
  });

  const menuActions = useMemo(
    () => [
      {
        id: 'openErrorGroupPage',
        name: i18n.translate('xpack.apm.requestFlyout.apmErrorGroup.openPage', {
          defaultMessage: 'Open error group page',
        }),
        href: errorPageHref,
        ebt: {
          action: EBT_CLICK_ACTIONS.OPEN_IN_APM,
          element: REQUEST_FLYOUT_EBT_ELEMENTS.DETAIL_LINK,
        },
      },
    ],
    [errorPageHref]
  );
  const panels = useLinksMenuPanels(menuActions, 'requestFlyoutApmErrorGroupActionsMenu');

  return (
    <FlyoutTemplate
      data-test-subj="requestFlyoutApmErrorGroupFlyout"
      onClose={onClose}
      ownFocus={false}
      size="fill"
      session="inherit"
      historyKey={historyKey}
    >
      <FlyoutTemplate.Header
        title={groupName}
        description={i18n.translate('xpack.apm.requestFlyout.apmErrorGroup.subtitle', {
          defaultMessage: 'APM error group of {service}',
          values: { service: serviceName },
        })}
      />
      <FlyoutTemplate.Body>
        {hasError ? (
          <FlyoutTemplate.Body.Callout
            level="warning"
            data-test-subj="requestFlyoutApmErrorGroupError"
            title={i18n.translate('xpack.apm.requestFlyout.apmErrorGroup.errorTitle', {
              defaultMessage: 'Unable to load this error group',
            })}
          />
        ) : !isLoading && !error ? (
          <EuiEmptyPrompt
            titleSize="s"
            title={
              <div>
                {i18n.translate('xpack.apm.requestFlyout.apmErrorGroup.sampleNotFound', {
                  defaultMessage: 'No error samples found for this group',
                })}
              </div>
            }
          />
        ) : (
          <EuiPanel hasBorder>
            <EuiFlexGroup alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('xpack.apm.requestFlyout.apmErrorGroup.sampleTitle', {
                      defaultMessage: 'Error sample',
                    })}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                {errorSampleIds.length > 0 && (
                  <EuiPagination
                    pageCount={errorSampleIds.length}
                    activePage={samplePage}
                    onPageClick={setSamplePage}
                    aria-label={i18n.translate(
                      'xpack.apm.requestFlyout.apmErrorGroup.paginationAriaLabel',
                      { defaultMessage: 'Error sample pages' }
                    )}
                    compressed
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />

            {isLoading || !error ? (
              <EuiSkeletonText lines={4} />
            ) : (
              <>
                <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
                  <EuiFlexItem grow={false}>
                    <Timestamp timestamp={getTimestampUs(error) / 1000} renderMode="tooltip" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{getEnvironmentLabel(errorEnvironment)}</EuiBadge>
                  </EuiFlexItem>
                  {exception?.handled === false && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="warning">
                        {i18n.translate('xpack.apm.requestFlyout.apmErrorGroup.unhandled', {
                          defaultMessage: 'Unhandled',
                        })}
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiDescriptionList
                  type="responsiveColumn"
                  columnWidths={['32%', '68%']}
                  listItems={[
                    {
                      title: i18n.translate('xpack.apm.requestFlyout.apmErrorGroup.groupId', {
                        defaultMessage: 'Group ID',
                      }),
                      description: groupId,
                    },
                    {
                      title: i18n.translate('xpack.apm.requestFlyout.apmErrorGroup.occurrences', {
                        defaultMessage: 'Occurrences',
                      }),
                      description: String(samples?.occurrencesCount ?? NOT_AVAILABLE_LABEL),
                    },
                    {
                      title: i18n.translate('xpack.apm.requestFlyout.apmErrorGroup.type', {
                        defaultMessage: 'Type',
                      }),
                      description: exception?.type ?? error.error?.type ?? NOT_AVAILABLE_LABEL,
                    },
                    {
                      title: i18n.translate('xpack.apm.requestFlyout.apmErrorGroup.sdk', {
                        defaultMessage: 'SDK',
                      }),
                      description: sdkLabel || NOT_AVAILABLE_LABEL,
                    },
                  ]}
                />
                <EuiSpacer size="m" />
                <SampleSummary error={error} />
                <EuiSpacer size="m" />
                <EuiTabs size="s">
                  {tabs.map(({ key, label }) => (
                    <EuiTab
                      key={key}
                      isSelected={currentTab?.key === key}
                      onClick={() => setActiveTabKey(key)}
                      {...getEbtProps({
                        action: REQUEST_FLYOUT_EBT_ACTIONS.VIEW_ERROR_TAB,
                        element: REQUEST_FLYOUT_EBT_ELEMENTS.ERROR_TABS,
                        detail: key,
                      })}
                    >
                      {label}
                    </EuiTab>
                  ))}
                </EuiTabs>
                <EuiSpacer size="m" />
                {currentTab && (
                  <ErrorSampleDetailTabContent error={error} currentTab={currentTab} />
                )}
              </>
            )}
          </EuiPanel>
        )}
      </FlyoutTemplate.Body>
      <FlyoutTemplate.Footer>
        <FlyoutTemplate.Footer.PrimaryActionMenu
          label={ACTIONS_BUTTON_LABEL}
          panels={panels}
          data-test-subj="requestFlyoutApmErrorGroupActionsButton"
          {...getEbtProps({
            action: EBT_CLICK_ACTIONS.OPEN_ACTIONS,
            element: REQUEST_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
          })}
        />
      </FlyoutTemplate.Footer>
    </FlyoutTemplate>
  );
}
