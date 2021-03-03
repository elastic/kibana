/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiTitle,
  EuiIconTip,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
} from '@elastic/eui';

import { InternalRollup } from '../../types';

// @ts-ignore
import { i18nTexts as dateHistogramI18nTexts } from '../step_date_histogram';

interface Props {
  rollupAction: InternalRollup;
}

export const TabSummary: FunctionComponent<Props> = ({ rollupAction }) => {
  const {
    dateHistogramIntervalType,
    dateHistogramInterval,
    dateHistogramTimeZone,
    dateHistogramField,
    rollupIndexIlmPolicy,
  } = rollupAction;

  return (
    <>
      <section
        aria-labelledby="rollupDetailDateHistogramTitle"
        data-test-subj="rollupDetailSummaryDateHistogramSection"
      >
        <EuiTitle size="s">
          <h3 id="rollupDetailDateHistogramTitle" data-test-subj="rollupDetailDateHistogramTitle">
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.rollup.summary.sectionDateHistogramLabel"
              defaultMessage="Date histogram"
            />
          </h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiDescriptionList textStyle="reverse">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.summary.itemTimeFieldLabel"
                  data-test-subj="rollupDetailDateHistogramTimeFieldTitle"
                  defaultMessage="Time field"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription
                className="eui-textBreakWord"
                data-test-subj="rollupDetailDateHistogramTimeFieldDescription"
              >
                {dateHistogramField}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.summary.itemIntervalLabel"
                  data-test-subj="rollupDetailDateHistogramIntervalTitle"
                  defaultMessage="Interval"
                />{' '}
                <EuiIconTip
                  content={
                    <FormattedMessage
                      id="xpack.indexLifecycleMgmt.rollup.summary.itemIntervalTip"
                      defaultMessage="The time bucket interval into which data is rolled up"
                    />
                  }
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="rollupDetailDateHistogramIntervalDescription">
                {dateHistogramInterval}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiDescriptionList textStyle="reverse">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.summary.itemTimezoneLabel"
                  data-test-subj="rollupDetailDateHistogramTimezoneTitle"
                  defaultMessage="Timezone"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="rollupDetailDateHistogramTimezoneDescription">
                {dateHistogramTimeZone}
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.summary.itemIntervalType"
                  data-test-subj="rollupDetailDateHistogramIntervalType"
                  defaultMessage="Interval type"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="rollupDetailDateHistogramIntervalTypeDescription">
                {dateHistogramI18nTexts.timeIntervalField[dateHistogramIntervalType]}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
        </EuiFlexGroup>
      </section>

      <EuiSpacer />

      <section
        aria-labelledby="rollupActionConfigDetailLogisticsTitle"
        data-test-subj="rollupDetailSummaryLogisticsSection"
      >
        <EuiTitle size="s">
          <h3 id="rollupDetailLogisticsTitle" data-test-subj="rollupDetailLogisticsTitle">
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.rollup.summary.sectionLogisticsLabel"
              defaultMessage="Logistics"
            />
          </h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiDescriptionList textStyle="reverse">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.summary.itemRollupIndexILMPolicy"
                  data-test-subj="rollupDetailLogisticsDelayTitle"
                  defaultMessage="Rollup index ILM policy"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="rollupActionDetailLogisticsDelayDescription">
                {rollupIndexIlmPolicy || (
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.rollup.summary.itemRollupIndexILMPolicy.default"
                    defaultMessage="This policy will manage the rollup index."
                  />
                )}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />
      </section>
    </>
  );
};
