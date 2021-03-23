/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import qs from 'query-string';
import React, { FunctionComponent, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiConfirmModal,
} from '@elastic/eui';

import { RollupAction } from '../../../../../../../../common/types';

import { i18nTexts as globalI18nTexts } from '../../../../i18n_texts';

import { DescribedFormRow } from '../../../../components';
import { UseField } from '../../../../form';

import './rollup_field.scss';

interface Props {
  phase: 'hot' | 'cold';
}

const i18nTexts = {
  description: i18n.translate('xpack.indexLifecycleMgmt.rollup.fieldDescription', {
    // TODO: Copy required
    defaultMessage: '[Brief description of rollups in the context of ILM]',
  }),
  editRollupAction: i18n.translate('xpack.indexLifecycleMgmt.rollup.editConfigurationButtonLabel', {
    // TODO: Copy required
    defaultMessage: '[Edit rollup]',
  }),
  configureRollupAction: i18n.translate(
    'xpack.indexLifecycleMgmt.rollup.addConfigurationButtonLabel',
    {
      // TODO: Copy required
      defaultMessage: '[Configure rollup]',
    }
  ),
  deleteRollupAction: i18n.translate(
    'xpack.indexLifecycleMgmt.rollup.deleteConfigurationButtonLabel',
    {
      // TODO: Copy required
      defaultMessage: '[Delete configuration]',
    }
  ),
  modal: {
    title: i18n.translate('xpack.indexLifecycleMgmt.rollup.deleteConfigurationModal.title', {
      // TODO: Copy required
      defaultMessage: '[Delete configuration]',
    }),
    body: i18n.translate('xpack.indexLifecycleMgmt.rollup.deleteConfigurationModal.description', {
      // TODO: Copy required
      defaultMessage: 'Are you sure you want to delete this rollup configuration?',
    }),
    footer: {
      cancel: i18n.translate(
        'xpack.indexLifecycleMgmt.rollup.deleteConfigurationModal.canceButtonLabel',
        {
          // TODO: Copy required
          defaultMessage: 'Cancel',
        }
      ),
      delete: i18n.translate(
        'xpack.indexLifecycleMgmt.rollup.deleteConfigurationModal.deleteButtonLabel',
        {
          // TODO: Copy required
          defaultMessage: 'Delete',
        }
      ),
    },
  },
};

export const RollupField: FunctionComponent<Props> = ({ phase }) => {
  const history = useHistory();

  const path = `phases.${phase}.actions.rollup.config`;

  const [isShowingDeleteModal, setIsShowingDeleteModal] = useState(false);
  const closeModal = () => {
    setIsShowingDeleteModal(false);
  };

  return (
    <>
      <DescribedFormRow
        title={<h3 id={`${phase}-rollup`}>{globalI18nTexts.editPolicy.rollupLabel}</h3>}
        description={i18nTexts.description}
        fullWidth
      >
        <UseField<RollupAction['config'] | undefined> path={path}>
          {(field) => {
            if (!field.value) {
              return (
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconType="exit"
                      iconSide="right"
                      onClick={() => {
                        history.push({ search: qs.stringify({ rollup: phase }) });
                      }}
                    >
                      {i18nTexts.configureRollupAction}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              );
            } else {
              return (
                <>
                  <div className="ilmRollupSummaryContainer">
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
                            {field.value.groups.date_histogram.field}
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
                            {field.value.groups.date_histogram.calendar_interval ||
                              field.value.groups.date_histogram.fixed_interval}
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
                            {field.value.groups.date_histogram.time_zone}
                          </EuiDescriptionListDescription>
                        </EuiDescriptionList>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiFlexGroup gutterSize="none" alignItems="center">
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          flush="left"
                          iconType="exit"
                          iconSide="right"
                          onClick={() => {
                            history.push({ search: qs.stringify({ rollup: phase }) });
                          }}
                        >
                          {i18nTexts.editRollupAction}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          flush="both"
                          color="danger"
                          onClick={() => {
                            setIsShowingDeleteModal(true);
                          }}
                        >
                          {i18nTexts.deleteRollupAction}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                  {isShowingDeleteModal && (
                    <EuiConfirmModal
                      title={i18nTexts.modal.title}
                      cancelButtonText={i18nTexts.modal.footer.cancel}
                      onCancel={closeModal}
                      confirmButtonText={i18nTexts.modal.footer.delete}
                      onConfirm={() => {
                        field.setValue(undefined);
                        closeModal();
                      }}
                      buttonColor="danger"
                      defaultFocusedButton="cancel"
                    />
                  )}
                </>
              );
            }
          }}
        </UseField>
      </DescribedFormRow>
    </>
  );
};
