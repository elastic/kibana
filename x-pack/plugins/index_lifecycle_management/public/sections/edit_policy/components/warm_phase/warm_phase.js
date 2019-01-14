/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent } from 'react';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import PropTypes from 'prop-types';
import {
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiFormRow,
  EuiFieldNumber,
  EuiSwitch,
  EuiDescribedFormGroup,
  EuiButton,
} from '@elastic/eui';
import {
  PHASE_WARM,
  PHASE_ENABLED,
  WARM_PHASE_ON_ROLLOVER,
  PHASE_ROLLOVER_ALIAS,
  PHASE_FORCE_MERGE_ENABLED,
  PHASE_FORCE_MERGE_SEGMENTS,
  PHASE_NODE_ATTRS,
  PHASE_PRIMARY_SHARD_COUNT,
  PHASE_REPLICA_COUNT,
  PHASE_ROLLOVER_MINIMUM_AGE,
  PHASE_ROLLOVER_MINIMUM_AGE_UNITS,
  PHASE_SHRINK_ENABLED,
} from '../../../../store/constants';
import { NodeAllocation } from '../node_allocation';
import { ErrableFormRow } from '../../form_errors';
import { LearnMoreLink, ActiveBadge, PhaseErrorMessage, OptionalLabel } from '../../../components';
import { MinAgeInput } from '../min_age_input';
class WarmPhaseUi extends PureComponent {
  static propTypes = {
    setPhaseData: PropTypes.func.isRequired,
    showNodeDetailsFlyout: PropTypes.func.isRequired,

    isShowingErrors: PropTypes.bool.isRequired,
    errors: PropTypes.object.isRequired,
    phaseData: PropTypes.shape({
      [PHASE_ENABLED]: PropTypes.bool.isRequired,
      [WARM_PHASE_ON_ROLLOVER]: PropTypes.bool.isRequired,
      [PHASE_ROLLOVER_ALIAS]: PropTypes.string.isRequired,
      [PHASE_FORCE_MERGE_ENABLED]: PropTypes.bool.isRequired,
      [PHASE_FORCE_MERGE_SEGMENTS]: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
        .isRequired,
      [PHASE_NODE_ATTRS]: PropTypes.string.isRequired,
      [PHASE_PRIMARY_SHARD_COUNT]: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
        .isRequired,
      [PHASE_REPLICA_COUNT]: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      [PHASE_ROLLOVER_MINIMUM_AGE]: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
        .isRequired,
      [PHASE_ROLLOVER_MINIMUM_AGE_UNITS]: PropTypes.string.isRequired,
    }).isRequired,
  };
  render() {
    const {
      setPhaseData,
      showNodeDetailsFlyout,
      phaseData,
      errors,
      isShowingErrors,
      hotPhaseRolloverEnabled,
      intl,
    } = this.props;
    const shrinkLabel = intl.formatMessage({
      id: 'xpack.indexLifecycleMgmt.warmPhase.shrinkIndexLabel',
      defaultMessage: 'Shrink index',
    });
    const moveToWarmPhaseOnRolloverLabel = intl.formatMessage({
      id: 'xpack.indexLifecycleMgmt.warmPhase.moveToWarmPhaseOnRolloverLabel',
      defaultMessage: 'Move to warm phase on rollover',
    });
    const forcemergeLabel = intl.formatMessage({
      id: 'xpack.indexLifecycleMgmt.warmPhase.forceMergeDataLabel',
      defaultMessage: 'Force merge data',
    });
    return (
      <Fragment>
        <EuiDescribedFormGroup
          title={
            <div>
              <span className="eui-displayInlineBlock eui-alignMiddle">
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseLabel"
                  defaultMessage="Warm phase"
                />
              </span>{' '}
              {phaseData[PHASE_ENABLED] && !isShowingErrors ? <ActiveBadge /> : null}
              <PhaseErrorMessage isShowingErrors={isShowingErrors} />
            </div>
          }
          titleSize="s"
          description={
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseDescriptionMessage"
                  defaultMessage="You are still querying your index, but it is read-only.
                    You can allocate shards to less performant hardware.
                    For faster searches, you can reduce the number of shards and force merge segments."
                />
              </p>
              {phaseData[PHASE_ENABLED] ? (
                <EuiButton
                  color="danger"
                  onClick={async () => {
                    await setPhaseData(PHASE_ENABLED, false);
                  }}
                  aria-controls="warmPhaseContent"
                >
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.deactivateWarmPhaseButton"
                    defaultMessage="Deactivate warm phase"
                  />
                </EuiButton>
              ) : (
                <EuiButton
                  data-test-subj="activatePhaseButton-warm"
                  onClick={async () => {
                    await setPhaseData(PHASE_ENABLED, true);
                  }}
                  aria-controls="warmPhaseContent"
                >
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.activateWarmPhaseButton"
                    defaultMessage="Activate warm phase"
                  />
                </EuiButton>
              )}
            </Fragment>
          }
          fullWidth
        >
          <Fragment>
            <div id="warmPhaseContent" aria-live="polite" role="region">
              {phaseData[PHASE_ENABLED] ? (
                <Fragment>
                  {hotPhaseRolloverEnabled ? (
                    <EuiFormRow
                      id={`${PHASE_WARM}-${WARM_PHASE_ON_ROLLOVER}`}
                    >
                      <EuiSwitch
                        data-test-subj="warmPhaseOnRolloverSwitch"
                        label={moveToWarmPhaseOnRolloverLabel}
                        id={`${PHASE_WARM}-${WARM_PHASE_ON_ROLLOVER}`}
                        checked={phaseData[WARM_PHASE_ON_ROLLOVER]}
                        onChange={async e => {
                          await setPhaseData(WARM_PHASE_ON_ROLLOVER, e.target.checked);
                        }}
                      />
                    </EuiFormRow>
                  ) : null}
                  {!phaseData[WARM_PHASE_ON_ROLLOVER] ? (
                    <MinAgeInput
                      errors={errors}
                      phaseData={phaseData}
                      phase={PHASE_WARM}
                      isShowingErrors={isShowingErrors}
                      setPhaseData={setPhaseData}
                      rolloverEnabled={hotPhaseRolloverEnabled}
                    />
                  ) : null}

                  <EuiSpacer />

                  <NodeAllocation
                    phase={PHASE_WARM}
                    setPhaseData={setPhaseData}
                    showNodeDetailsFlyout={showNodeDetailsFlyout}
                    errors={errors}
                    phaseData={phaseData}
                    isShowingErrors={isShowingErrors}
                  />

                  <EuiFlexGroup>
                    <EuiFlexItem grow={false} style={{ maxWidth: 188 }}>
                      <ErrableFormRow
                        id={`${PHASE_WARM}-${PHASE_REPLICA_COUNT}`}
                        label={
                          <Fragment>
                            <FormattedMessage
                              id="xpack.indexLifecycleMgmt.warmPhase.numberOfReplicasLabel"
                              defaultMessage="Number of replicas"
                            />
                            <OptionalLabel />
                          </Fragment>
                        }
                        errorKey={PHASE_REPLICA_COUNT}
                        isShowingErrors={isShowingErrors}
                        errors={errors}
                        helpText={
                          intl.formatMessage({
                            id: 'xpack.indexLifecycleMgmt.warmPhase.replicaCountHelpText',
                            defaultMessage: 'By default, the number of replicas remains the same.'
                          })
                        }
                      >
                        <EuiFieldNumber
                          id={`${PHASE_WARM}-${PHASE_REPLICA_COUNT}`}
                          value={phaseData[PHASE_REPLICA_COUNT]}
                          onChange={async e => {
                            await setPhaseData(PHASE_REPLICA_COUNT, e.target.value);
                          }}
                          min={0}
                        />
                      </ErrableFormRow>
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiSpacer size="m" />
                </Fragment>
              ) : null }
            </div>
          </Fragment>
        </EuiDescribedFormGroup>
        {phaseData[PHASE_ENABLED] ? (
          <Fragment>
            <EuiDescribedFormGroup
              title={
                <p>
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.shrinkText"
                    defaultMessage="Shrink"
                  />
                </p>
              }
              description={
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.shrinkIndexExplanationText"
                    defaultMessage="Shrink the index into a new index with fewer primary shards."
                  />{' '}
                  <LearnMoreLink docPath="indices-shrink-index.html#indices-shrink-index" />
                </EuiTextColor>
              }
              fullWidth
              titleSize="xs"
            >
              <Fragment>
                <EuiSwitch
                  data-test-subj="shrinkSwitch"
                  checked={phaseData[PHASE_SHRINK_ENABLED]}
                  onChange={async e => {
                    await setPhaseData(PHASE_SHRINK_ENABLED, e.target.checked);
                  }}
                  label={shrinkLabel}
                  aria-label={shrinkLabel}
                  aria-controls="shrinkContent"
                />
                <div id="shrinkContent" aria-live="polite" role="region">
                  {phaseData[PHASE_SHRINK_ENABLED] ? (
                    <Fragment>
                      <EuiSpacer />
                      <EuiFlexGroup>
                        <EuiFlexItem grow={false}>
                          <ErrableFormRow
                            id={`${PHASE_WARM}-${PHASE_PRIMARY_SHARD_COUNT}`}
                            label={intl.formatMessage({
                              id: 'xpack.indexLifecycleMgmt.warmPhase.numberOfPrimaryShardsLabel',
                              defaultMessage: 'Number of primary shards',
                            })}
                            errorKey={PHASE_PRIMARY_SHARD_COUNT}
                            isShowingErrors={isShowingErrors}
                            errors={errors}
                          >
                            <EuiFieldNumber
                              id={`${PHASE_WARM}-${PHASE_PRIMARY_SHARD_COUNT}`}
                              value={phaseData[PHASE_PRIMARY_SHARD_COUNT]}
                              onChange={async e => {
                                await setPhaseData(PHASE_PRIMARY_SHARD_COUNT, e.target.value);
                              }}
                              min={1}
                            />
                          </ErrableFormRow>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer />
                    </Fragment>
                  ) : null}
                </div>
              </Fragment>
            </EuiDescribedFormGroup>
            <EuiDescribedFormGroup
              title={
                <p>
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.forceMergeDataText"
                    defaultMessage="Force merge"
                  />
                </p>
              }
              description={
                <EuiTextColor color="subdued">
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.forceMergeDataExplanationText"
                    defaultMessage="Reduce the number of segments in your shard by merging smaller files and clearing deleted ones."
                  />{' '}
                  <LearnMoreLink docPath="indices-forcemerge.html" />
                </EuiTextColor>
              }
              titleSize="xs"
              fullWidth
            >
              <EuiSwitch
                data-test-subj="forceMergeSwitch"
                label={forcemergeLabel}
                aria-label={forcemergeLabel}
                checked={phaseData[PHASE_FORCE_MERGE_ENABLED]}
                onChange={async e => {
                  await setPhaseData(PHASE_FORCE_MERGE_ENABLED, e.target.checked);
                }}
                aria-controls="forcemergeContent"
              />

              <EuiSpacer />
              <div id="forcemergeContent" aria-live="polite" role="region">
                {phaseData[PHASE_FORCE_MERGE_ENABLED] ? (
                  <ErrableFormRow
                    id={`${PHASE_WARM}-${PHASE_FORCE_MERGE_SEGMENTS}`}
                    label={intl.formatMessage({
                      id: 'xpack.indexLifecycleMgmt.warmPhase.numberOfSegmentsLabel',
                      defaultMessage: 'Number of segments',
                    })}
                    errorKey={PHASE_FORCE_MERGE_SEGMENTS}
                    isShowingErrors={isShowingErrors}
                    errors={errors}
                  >
                    <EuiFieldNumber
                      id={`${PHASE_WARM}-${PHASE_FORCE_MERGE_SEGMENTS}`}
                      value={phaseData[PHASE_FORCE_MERGE_SEGMENTS]}
                      onChange={async e => {
                        await setPhaseData(PHASE_FORCE_MERGE_SEGMENTS, e.target.value);
                      }}
                      min={1}
                    />
                  </ErrableFormRow>
                ) : null}
              </div>
            </EuiDescribedFormGroup>
          </Fragment>
        ) : null}
      </Fragment>
    );
  }
}
export const WarmPhase = injectI18n(WarmPhaseUi);
