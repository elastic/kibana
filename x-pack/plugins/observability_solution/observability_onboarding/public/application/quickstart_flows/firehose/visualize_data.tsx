/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiSpacer, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';
import { union } from 'lodash';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { ObservabilityOnboardingAppServices } from '../../..';
import {
  FIREHOSE_CLOUDFORMATION_STACK_NAME,
  FIREHOSE_LOGS_STREAM_NAME,
  type AWSIndexName,
} from '../../../../common/aws_firehose';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { AccordionWithIcon } from '../shared/accordion_with_icon';
import { GetStartedPanel } from '../shared/get_started_panel';
import { useAWSServiceGetStartedList } from './use_aws_service_get_started_list';
import { AutoRefreshCallout } from './auto_refresh_callout';
import { ProgressCallout } from './progress_callout';
import { HAS_DATA_FETCH_INTERVAL } from './utils';

const REQUEST_PENDING_STATUS_LIST = [FETCH_STATUS.LOADING, FETCH_STATUS.NOT_INITIATED];

export function VisualizeData() {
  const accordionId = useGeneratedHtmlId({ prefix: 'accordion' });
  const [orderedPopulatedAWSLogsIndexList, setOrderedPopulatedAWSLogsIndexList] = useState<
    AWSIndexName[]
  >([]);
  const [shouldShowDataReceivedToast, setShouldShowDataReceivedToast] = useState<boolean>(true);
  const {
    data: populatedAWSLogsIndexList,
    status,
    refetch,
  } = useFetcher((callApi) => {
    return callApi('GET /internal/observability_onboarding/firehose/has-data', {
      params: {
        query: {
          logsStreamName: FIREHOSE_LOGS_STREAM_NAME,
          stackName: FIREHOSE_CLOUDFORMATION_STACK_NAME,
        },
      },
    });
  }, []);
  const {
    services: { notifications },
  } = useKibana<ObservabilityOnboardingAppServices>();

  useEffect(() => {
    if (
      shouldShowDataReceivedToast &&
      Array.isArray(populatedAWSLogsIndexList) &&
      populatedAWSLogsIndexList.length > 0
    ) {
      notifications?.toasts.addSuccess(
        {
          title: i18n.translate(
            'xpack.observability_onboarding.firehosePanel.dataReceivedToastTitle',
            {
              defaultMessage: 'Your data is on its way',
            }
          ),
          text: i18n.translate(
            'xpack.observability_onboarding.firehosePanel.dataReceivedToastText',
            {
              defaultMessage:
                'We’ve begun processing your data. In the background, we automatically refresh every few seconds to capture more incoming data.',
            }
          ),
        },
        {
          toastLifeTimeMs: 10000,
        }
      );
      setShouldShowDataReceivedToast(false);
    }

    setOrderedPopulatedAWSLogsIndexList((currentList) =>
      /**
       * Using union() to ensure items in the array are unique
       * add stay in the insertion order to keep the order of
       * the AWS services in the UI.
       */
      union(currentList, populatedAWSLogsIndexList)
    );
  }, [notifications?.toasts, populatedAWSLogsIndexList, shouldShowDataReceivedToast]);

  const awsServiceGetStartedConfigList = useAWSServiceGetStartedList();

  useInterval(() => {
    if (REQUEST_PENDING_STATUS_LIST.includes(status)) {
      return;
    }

    refetch();
  }, HAS_DATA_FETCH_INTERVAL);

  if (populatedAWSLogsIndexList === undefined) {
    return null;
  }

  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.firehosePanel.visualizeDataDescription"
            defaultMessage="Once the Firehose stream is created, data capture will begin automatically, and the incoming data will be displayed below."
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      {orderedPopulatedAWSLogsIndexList.length === 0 && <ProgressCallout />}
      {orderedPopulatedAWSLogsIndexList.length > 0 && <AutoRefreshCallout />}

      <EuiSpacer size="m" />

      <div data-test-subj="observabilityOnboardingAWSServiceList">
        {orderedPopulatedAWSLogsIndexList.map((indexName, index) => {
          const getStartedConfig = awsServiceGetStartedConfigList.find(({ indexNameList }) =>
            indexNameList.includes(indexName)
          );

          if (!getStartedConfig) {
            return null;
          }

          const { id, actionLinks, title, logoURL, previewImage } = getStartedConfig;

          return (
            <AccordionWithIcon
              data-test-subj={`observabilityOnboardingAWSService-${id}`}
              key={id}
              id={`${accordionId}_${id}`}
              icon={<EuiIcon type={logoURL} size="l" />}
              title={title}
              initialIsOpen={true}
              borders={
                index === 0 || index === orderedPopulatedAWSLogsIndexList.length - 1
                  ? 'none'
                  : 'horizontal'
              }
            >
              <GetStartedPanel
                integration="aws"
                newTab
                isLoading={false}
                actionLinks={actionLinks}
                previewImage={previewImage}
              />
            </AccordionWithIcon>
          );
        })}
      </div>
    </>
  );
}
