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
  EuiAccordion,
  EuiIcon,
  EuiIconTip,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
} from '@elastic/eui';

import { RollupAction } from '../../../../../../../common/types';

import { i18nTexts as globalI18nTexts } from '../../../i18n_texts';

import { DescribedFormRow } from '../../../components';
import { UseField } from '../../../form';

interface Props {
  phase: 'hot' | 'cold';
}

const i18nTexts = {
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

  const renderGoToRollupWizardButton = () => (
    <EuiButtonEmpty
      iconType="exit"
      iconSide="right"
      onClick={() => {
        history.push({ search: qs.stringify({ rollup: phase }) });
      }}
    >
      {i18nTexts.configureRollupAction}
    </EuiButtonEmpty>
  );

  return (
    <>
      <DescribedFormRow
        title={<h3 id={`${phase}-rollup`}>{globalI18nTexts.editPolicy.rollupLabel}</h3>}
        description={i18n.translate('xpack.indexLifecycleMgmt.rollup.fieldDescription', {
          // TODO: Copy required
          defaultMessage: '[Brief description of rollups in the context of ILM]',
        })}
        fullWidth
      >
        <UseField<RollupAction['config'] | undefined> path={path}>
          {(field) => {
            if (!field.value) {
              return (
                <EuiFlexGroup>
                  <EuiFlexItem>
                    {!field.isValid && (
                      <>
                        <EuiIcon type="alert" color="danger" />{' '}
                      </>
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem>{renderGoToRollupWizardButton()}</EuiFlexItem>
                </EuiFlexGroup>
              );
            } else {
              return (
                <>
                  <EuiAccordion
                    id={`${phase}RollupActionDetailsAccordion`}
                    buttonContent={i18n.translate(
                      'xpack.indexLifecycleMgmt.rollup.fieldSummaryLabel',
                      {
                        defaultMessage: 'Rollup summary',
                      }
                    )}
                    extraAction={
                      <EuiFlexGroup gutterSize="s">
                        <EuiFlexItem>{renderGoToRollupWizardButton()}</EuiFlexItem>
                        <EuiFlexItem>
                          <EuiButtonEmpty
                            color="danger"
                            onClick={() => {
                              setIsShowingDeleteModal(true);
                            }}
                          >
                            {i18nTexts.deleteRollupAction}
                          </EuiButtonEmpty>
                        </EuiFlexItem>
                      </EuiFlexGroup>
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
                  </EuiAccordion>
                  {isShowingDeleteModal && (
                    <EuiModal onClose={closeModal} initialFocus="[name=popswitch]">
                      <EuiModalHeader>
                        <EuiModalHeaderTitle>{i18nTexts.modal.title}</EuiModalHeaderTitle>
                      </EuiModalHeader>

                      <EuiModalBody>{i18nTexts.modal.body}</EuiModalBody>

                      <EuiModalFooter>
                        <EuiButtonEmpty onClick={closeModal}>
                          {i18nTexts.modal.footer.cancel}
                        </EuiButtonEmpty>

                        <EuiButton
                          onClick={() => {
                            field.setValue(undefined);
                            closeModal();
                          }}
                          color="danger"
                          fill
                        >
                          {i18nTexts.modal.footer.delete}
                        </EuiButton>
                      </EuiModalFooter>
                    </EuiModal>
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
