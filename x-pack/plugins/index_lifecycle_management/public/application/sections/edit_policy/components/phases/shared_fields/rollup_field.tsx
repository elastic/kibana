/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import qs from 'query-string';
import React, { FunctionComponent } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiButtonEmpty,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiAccordion,
  EuiIcon,
  EuiIconTip,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';

import { RollupAction } from '../../../../../../../common/types';

import { i18nTexts as globalI18nTexts } from '../../../i18n_texts';

import { ToggleFieldWithDescribedFormRow } from '../../../components';
import { UseField } from '../../../form';

interface Props {
  phase: 'hot' | 'cold';
}

const i18nTexts = {
  states: {
    activeNotConfigured: {
      heading: i18n.translate('xpack.indexLifecycleMgmt.rollup.configurationRequiredLabel', {
        // TODO: Copy required
        defaultMessage: '[Tells user rollup configuration required]',
      }),
      buttonLabel: i18n.translate(
        'xpack.indexLifecycleMgmt.rollup.configurationRequired.buttonLabel',
        {
          // TODO: Copy required
          defaultMessage: '[Configure rollup]',
        }
      ),
    },
  },
};

export const RollupField: FunctionComponent<Props> = ({ phase }) => {
  const history = useHistory();

  const path = `phases.${phase}.actions.rollup`;

  return (
    <ToggleFieldWithDescribedFormRow
      title={<h3>{globalI18nTexts.editPolicy.rollupLabel}</h3>}
      // TODO: Copy required
      description={i18n.translate('xpack.indexLifecycleMgmt.rollup.fieldDescription', {
        // TODO: Copy required
        defaultMessage: '[Brief description of rollups in the context of ILM]',
      })}
      switchProps={{
        'data-test-subj': `${phase}-configureRollupSwitch`,
        path: `_meta.${phase}.rollupEnabled`,
      }}
      fullWidth
    >
      <UseField<RollupAction> path={path}>
        {(field) => {
          if (!field.value) {
            return (
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText>
                    {!field.isValid && (
                      <>
                        <EuiIcon type="alert" color="danger" />{' '}
                      </>
                    )}
                    {i18nTexts.states.activeNotConfigured.heading}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonEmpty
                    iconType="exit"
                    iconSide="right"
                    onClick={() => {
                      history.push({ search: qs.stringify({ rollup: phase }) });
                    }}
                  >
                    {i18nTexts.states.activeNotConfigured.buttonLabel}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          } else {
            return (
              <EuiAccordion
                id={`${phase}RollupActionDetailsAccordion`}
                buttonContent={i18n.translate('xpack.indexLifecycleMgmt.rollup.fieldSummaryLabel', {
                  defaultMessage: 'Rollup summary',
                })}
                extraAction={
                  <EuiButtonEmpty
                    iconType="exit"
                    iconSide="right"
                    onClick={() => {
                      history.push({ search: qs.stringify({ rollup: phase }) });
                    }}
                  >
                    {i18nTexts.states.activeNotConfigured.buttonLabel}
                  </EuiButtonEmpty>
                }
              >
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
                        {field.value.config.groups.date_histogram.field}
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
                        {field.value.config.groups.date_histogram.calendar_interval ||
                          field.value.config.groups.date_histogram.fixed_interval}
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
                        {field.value.config.groups.date_histogram.time_zone}
                      </EuiDescriptionListDescription>
                    </EuiDescriptionList>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiAccordion>
            );
          }
        }}
      </UseField>
    </ToggleFieldWithDescribedFormRow>
  );
};
