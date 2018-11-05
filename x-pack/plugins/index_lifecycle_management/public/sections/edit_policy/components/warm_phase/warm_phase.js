/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiFormRow,
  EuiFieldNumber,
  EuiSelect,
  EuiSwitch,
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiBadge,
  EuiButton,
} from '@elastic/eui';
import {
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
import { ErrableFormRow } from '../../form_errors';
import { LearnMoreLink } from '../../../../components/learn_more_link';

export class WarmPhase extends PureComponent {
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
      [PHASE_ROLLOVER_MINIMUM_AGE]: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      [PHASE_ROLLOVER_MINIMUM_AGE_UNITS]: PropTypes.string.isRequired,
    }).isRequired,
    nodeOptions: PropTypes.array.isRequired,
  };

  componentWillMount() {
    this.props.fetchNodes();
  }

  render() {
    const {
      setPhaseData,
      showNodeDetailsFlyout,
      phaseData,
      nodeOptions,
      errors,
      isShowingErrors,
      hotPhaseRolloverEnabled,
    } = this.props;

    return (
      <EuiDescribedFormGroup
        title={
          <div>
            <span className="eui-displayInlineBlock eui-alignMiddle">Warm phase</span>{' '}
            {phaseData[PHASE_ENABLED] ? (
              <EuiBadge className="eui-alignMiddle">Active</EuiBadge>
            ) : null}
          </div>
        }
        titleSize="s"
        description={
          <Fragment>
            <p>
              Your index becomes read-only when it enters the warm phase. You can optimize this
              phase for search.
            </p>
            {isShowingErrors ? (
              <EuiTextColor color="danger">
                <EuiText>
                  <p>This phase contains errors</p>
                </EuiText>
              </EuiTextColor>
            ) : null}
          </Fragment>
        }
        fullWidth
      >
        <Fragment>
          {phaseData[PHASE_ENABLED] ? (
            <Fragment>
              <EuiFormRow hasEmptyLabelSpace>
                <div>
                  <EuiButton
                    color="danger"
                    onClick={async () => {
                      await setPhaseData(PHASE_ENABLED, false);
                    }}
                  >
                    Deactivate warm phase
                  </EuiButton>
                </div>
              </EuiFormRow>
              {hotPhaseRolloverEnabled ? (
                <EuiFormRow label="Rollover configuration">
                  <EuiSwitch
                    label="Move to warm phase on rollover"
                    checked={phaseData[WARM_PHASE_ON_ROLLOVER]}
                    onChange={async e => {
                      await setPhaseData(WARM_PHASE_ON_ROLLOVER, e.target.checked);
                    }}
                  />
                </EuiFormRow>
              ) : null}
              {!phaseData[WARM_PHASE_ON_ROLLOVER] ? (
                <EuiFlexGroup>
                  <EuiFlexItem style={{ maxWidth: 188 }}>
                    <ErrableFormRow
                      label="Move to warm phase after"
                      errorKey={PHASE_ROLLOVER_MINIMUM_AGE}
                      isShowingErrors={isShowingErrors}
                      errors={errors}
                    >
                      <EuiFieldNumber
                        value={phaseData[PHASE_ROLLOVER_MINIMUM_AGE]}
                        onChange={async e => {
                          setPhaseData(PHASE_ROLLOVER_MINIMUM_AGE, e.target.value);
                        }}
                        min={1}
                      />
                    </ErrableFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem style={{ maxWidth: 188 }}>
                    <EuiFormRow hasEmptyLabelSpace>
                      <EuiSelect
                        value={phaseData[PHASE_ROLLOVER_MINIMUM_AGE_UNITS]}
                        onChange={async e => {
                          await setPhaseData(PHASE_ROLLOVER_MINIMUM_AGE_UNITS, e.target.value);
                        }}
                        options={[
                          { value: 'd', text: 'days' },
                          { value: 'h', text: 'hours' },
                        ]}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : null}

              <EuiSpacer />

              <ErrableFormRow
                label="Choose where to allocate indices by node attribute"
                errorKey={PHASE_NODE_ATTRS}
                isShowingErrors={isShowingErrors}
                errors={errors}
                helpText={
                  phaseData[PHASE_NODE_ATTRS] ? (
                    <EuiButtonEmpty
                      flush="left"
                      onClick={() => showNodeDetailsFlyout(phaseData[PHASE_NODE_ATTRS])}
                    >
                      View node details
                    </EuiButtonEmpty>
                  ) : null
                }
              >
                <EuiSelect
                  value={phaseData[PHASE_NODE_ATTRS] || ' '}
                  options={nodeOptions}
                  onChange={async e => {
                    await setPhaseData(PHASE_NODE_ATTRS, e.target.value);
                  }}
                />
              </ErrableFormRow>

              <EuiFlexGroup>
                <EuiFlexItem grow={false} style={{ maxWidth: 188 }}>
                  <ErrableFormRow
                    label="Number of replicas"
                    errorKey={PHASE_REPLICA_COUNT}
                    isShowingErrors={isShowingErrors}
                    errors={errors}
                  >
                    <EuiFieldNumber
                      value={phaseData[PHASE_REPLICA_COUNT]}
                      onChange={async e => {
                        await setPhaseData(PHASE_REPLICA_COUNT, e.target.value);
                      }}
                      min={0}
                    />
                  </ErrableFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>


              <Fragment>
                <EuiSpacer />
                <EuiTitle size="s">
                  <p>Shrink</p>
                </EuiTitle>
                <EuiTitle size="xs">
                  <EuiTextColor color="subdued">
                      Shrink the index into a new index with fewer primary shards.{' '}
                    <LearnMoreLink docPath="indices-shrink-index.html#indices-shrink-index" />
                  </EuiTextColor>
                </EuiTitle>

                <EuiSpacer />

                <EuiSwitch
                  checked={phaseData[PHASE_SHRINK_ENABLED]}
                  onChange={async e => {
                    await setPhaseData(PHASE_SHRINK_ENABLED, e.target.checked);
                  }}
                  label="Shrink index"
                />
                {phaseData[PHASE_SHRINK_ENABLED] ? (
                  <Fragment>
                    <EuiSpacer />
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <ErrableFormRow
                          label="Number of primary shards"
                          errorKey={PHASE_PRIMARY_SHARD_COUNT}
                          isShowingErrors={isShowingErrors}
                          errors={errors}
                        >
                          <EuiFieldNumber
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
              </Fragment>
              <EuiSpacer size="m" />
              <EuiTitle size="s">
                <p>Force merge</p>
              </EuiTitle>
              <EuiTitle size="xs">
                <EuiTextColor color="subdued">
                  Reduce the number of segments in your shard by merging smaller files and clearing
                  deleted ones. <LearnMoreLink docPath="indices-forcemerge.html" />
                </EuiTextColor>
              </EuiTitle>

              <EuiSpacer size="m" />

              <EuiSwitch
                label="Force merge data"
                checked={phaseData[PHASE_FORCE_MERGE_ENABLED]}
                onChange={async e => {
                  await setPhaseData(PHASE_FORCE_MERGE_ENABLED, e.target.checked);
                }}
              />

              <EuiSpacer />

              {phaseData[PHASE_FORCE_MERGE_ENABLED] ? (
                <ErrableFormRow
                  label="Number of segments"
                  errorKey={PHASE_FORCE_MERGE_SEGMENTS}
                  isShowingErrors={isShowingErrors}
                  errors={errors}
                >
                  <EuiFieldNumber
                    value={phaseData[PHASE_FORCE_MERGE_SEGMENTS]}
                    onChange={async e => {
                      await setPhaseData(PHASE_FORCE_MERGE_SEGMENTS, e.target.value);
                    }}
                    min={1}
                  />
                </ErrableFormRow>
              ) : null}
            </Fragment>
          ) : (
            <EuiFormRow hasEmptyLabelSpace>
              <div>
                <EuiButton
                  onClick={async () => {
                    await setPhaseData(PHASE_ENABLED, true);
                  }}
                >
                  Activate warm phase
                </EuiButton>
              </div>
            </EuiFormRow>
          )}
        </Fragment>
      </EuiDescribedFormGroup>
    );
  }
}
