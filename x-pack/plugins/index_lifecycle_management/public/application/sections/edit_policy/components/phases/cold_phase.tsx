/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';

import { EuiFieldNumber, EuiDescribedFormGroup, EuiSwitch, EuiTextColor } from '@elastic/eui';

import { ColdPhase as ColdPhaseInterface, Phases } from '../../../../../../common/types';

import { useFormData } from '../../../../../shared_imports';

import { PhaseValidationErrors } from '../../../../services/policies/policy_validation';

import {
  LearnMoreLink,
  ActiveBadge,
  PhaseErrorMessage,
  OptionalLabel,
  ErrableFormRow,
  SetPriorityInput,
  MinAgeInput,
  DescribedFormField,
} from '../';

import { DataTierAllocationField, useRolloverPath } from './shared';

const i18nTexts = {
  freezeLabel: i18n.translate('xpack.indexLifecycleMgmt.coldPhase.freezeIndexLabel', {
    defaultMessage: 'Freeze index',
  }),
  dataTierAllocation: {
    description: i18n.translate('xpack.indexLifecycleMgmt.coldPhase.dataTier.description', {
      defaultMessage:
        'Move data to nodes optimized for less frequent, read-only access. Store data in the cold phase on less-expensive hardware.',
    }),
  },
};

const coldProperty: keyof Phases = 'cold';
const phaseProperty = (propertyName: keyof ColdPhaseInterface) => propertyName;

interface Props {
  setPhaseData: (key: keyof ColdPhaseInterface & string, value: string | boolean) => void;
  phaseData: ColdPhaseInterface;
  isShowingErrors: boolean;
  errors?: PhaseValidationErrors<ColdPhaseInterface>;
}
export const ColdPhase: FunctionComponent<Props> = ({
  setPhaseData,
  phaseData,
  errors,
  isShowingErrors,
}) => {
  const [formData] = useFormData({
    watch: [useRolloverPath],
  });

  const hotPhaseRolloverEnabled = get(formData, useRolloverPath);

  return (
    <div id="coldPhaseContent" aria-live="polite" role="region">
      <>
        {/* Section title group; containing min age */}
        <EuiDescribedFormGroup
          title={
            <div>
              <h2 className="eui-displayInlineBlock eui-alignMiddle">
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.coldPhaseLabel"
                  defaultMessage="Cold phase"
                />
              </h2>{' '}
              {phaseData.phaseEnabled && !isShowingErrors ? <ActiveBadge /> : null}
              <PhaseErrorMessage isShowingErrors={isShowingErrors} />
            </div>
          }
          titleSize="s"
          description={
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.coldPhaseDescriptionText"
                  defaultMessage="You are querying your index less frequently, so you can allocate shards
                  on significantly less performant hardware.
                  Because your queries are slower, you can reduce the number of replicas."
                />
              </p>
              <EuiSwitch
                data-test-subj="enablePhaseSwitch-cold"
                label={
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.activateColdPhaseSwitchLabel"
                    defaultMessage="Activate cold phase"
                  />
                }
                id={`${coldProperty}-${phaseProperty('phaseEnabled')}`}
                checked={phaseData.phaseEnabled}
                onChange={(e) => {
                  setPhaseData(phaseProperty('phaseEnabled'), e.target.checked);
                }}
                aria-controls="coldPhaseContent"
              />
            </Fragment>
          }
          fullWidth
        >
          {phaseData.phaseEnabled ? (
            <MinAgeInput<ColdPhaseInterface>
              errors={errors}
              phaseData={phaseData}
              phase={coldProperty}
              isShowingErrors={isShowingErrors}
              setPhaseData={setPhaseData}
              rolloverEnabled={hotPhaseRolloverEnabled}
            />
          ) : null}
        </EuiDescribedFormGroup>
        {phaseData.phaseEnabled ? (
          <Fragment>
            {/* Data tier allocation section */}
            <DataTierAllocationField
              description={i18nTexts.dataTierAllocation.description}
              phase={coldProperty}
              setPhaseData={setPhaseData}
              isShowingErrors={isShowingErrors}
              phaseData={phaseData}
            />

            {/* Replicas section */}
            <DescribedFormField
              title={
                <h3>
                  {i18n.translate('xpack.indexLifecycleMgmt.coldPhase.replicasTitle', {
                    defaultMessage: 'Replicas',
                  })}
                </h3>
              }
              description={i18n.translate(
                'xpack.indexLifecycleMgmt.coldPhase.numberOfReplicasDescription',
                {
                  defaultMessage:
                    'Set the number of replicas. Remains the same as the previous phase by default.',
                }
              )}
              switchProps={{
                label: i18n.translate(
                  'xpack.indexLifecycleMgmt.editPolicy.coldPhase.numberOfReplicas.switchLabel',
                  { defaultMessage: 'Set replicas' }
                ),
                initialValue: Boolean(phaseData.selectedReplicaCount),
                onChange: (v) => {
                  if (!v) {
                    setPhaseData('selectedReplicaCount', '');
                  }
                },
              }}
              fullWidth
            >
              <ErrableFormRow
                id={`${coldProperty}-${phaseProperty('selectedReplicaCount')}`}
                label={
                  <Fragment>
                    <FormattedMessage
                      id="xpack.indexLifecycleMgmt.coldPhase.numberOfReplicasLabel"
                      defaultMessage="Number of replicas"
                    />
                    <OptionalLabel />
                  </Fragment>
                }
                isShowingErrors={isShowingErrors}
                errors={errors?.selectedReplicaCount}
              >
                <EuiFieldNumber
                  id={`${coldProperty}-${phaseProperty('selectedReplicaCount')}`}
                  value={phaseData.selectedReplicaCount}
                  onChange={(e) => {
                    setPhaseData(phaseProperty('selectedReplicaCount'), e.target.value);
                  }}
                  min={0}
                />
              </ErrableFormRow>
            </DescribedFormField>
            {/* Freeze section */}
            <EuiDescribedFormGroup
              title={
                <h3>
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.freezeText"
                    defaultMessage="Freeze"
                  />
                </h3>
              }
              description={
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.coldPhase.freezeIndexExplanationText"
                    defaultMessage="Make the index read-only and minimize its memory footprint."
                  />{' '}
                  <LearnMoreLink docPath="frozen-indices.html" />
                </EuiTextColor>
              }
              fullWidth
              titleSize="xs"
            >
              <EuiSwitch
                data-test-subj="freezeSwitch"
                checked={phaseData.freezeEnabled}
                onChange={(e) => {
                  setPhaseData(phaseProperty('freezeEnabled'), e.target.checked);
                }}
                label={i18nTexts.freezeLabel}
                aria-label={i18nTexts.freezeLabel}
              />
            </EuiDescribedFormGroup>
            <SetPriorityInput<ColdPhaseInterface>
              errors={errors}
              phaseData={phaseData}
              phase={coldProperty}
              isShowingErrors={isShowingErrors}
              setPhaseData={setPhaseData}
            />
          </Fragment>
        ) : null}
      </>
    </div>
  );
};
