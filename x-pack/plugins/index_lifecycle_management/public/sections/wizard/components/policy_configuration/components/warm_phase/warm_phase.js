/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiAccordion,
  EuiFormRow,
  EuiFieldNumber,
  EuiSelect,
  EuiSwitch,
  EuiButtonEmpty,
  EuiLink,
} from '@elastic/eui';
import {
  PHASE_ENABLED,
  PHASE_ROLLOVER_ENABLED,
  PHASE_ROLLOVER_ALIAS,
  PHASE_FORCE_MERGE_ENABLED,
  PHASE_FORCE_MERGE_SEGMENTS,
  PHASE_NODE_ATTRS,
  PHASE_PRIMARY_SHARD_COUNT,
  PHASE_REPLICA_COUNT,
  PHASE_ROLLOVER_AFTER,
  PHASE_ROLLOVER_AFTER_UNITS,
  PHASE_SHRINK_ENABLED,
} from '../../../../../../store/constants';
import { ErrableFormRow } from '../../../../form_errors';

export class WarmPhase extends Component {
  static propTypes = {
    setPhaseData: PropTypes.func.isRequired,
    validate: PropTypes.func.isRequired,
    showNodeDetailsFlyout: PropTypes.func.isRequired,

    isShowingErrors: PropTypes.bool.isRequired,
    errors: PropTypes.object.isRequired,
    phaseData: PropTypes.shape({
      [PHASE_ENABLED]: PropTypes.bool.isRequired,
      [PHASE_ROLLOVER_ENABLED]: PropTypes.bool.isRequired,
      [PHASE_ROLLOVER_ALIAS]: PropTypes.string.isRequired,
      [PHASE_FORCE_MERGE_ENABLED]: PropTypes.bool.isRequired,
      [PHASE_FORCE_MERGE_SEGMENTS]: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string,
      ]).isRequired,
      [PHASE_NODE_ATTRS]: PropTypes.string.isRequired,
      [PHASE_PRIMARY_SHARD_COUNT]: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string,
      ]).isRequired,
      [PHASE_REPLICA_COUNT]: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string,
      ]).isRequired,
      [PHASE_ROLLOVER_AFTER]: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string,
      ]).isRequired,
      [PHASE_ROLLOVER_AFTER_UNITS]: PropTypes.string.isRequired,
    }).isRequired,

    hotPhaseReplicaCount: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]).isRequired,
    hotPhasePrimaryShardCount: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]).isRequired,

    nodeOptions: PropTypes.array.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      applyOnRollover: false,
    };
  }

  componentWillMount() {
    this.props.fetchNodes();
  }

  render() {
    const {
      validate,
      setPhaseData,
      showNodeDetailsFlyout,

      phaseData,
      hotPhaseReplicaCount,
      hotPhasePrimaryShardCount,
      nodeOptions,
      errors,
      isShowingErrors,
      hotPhaseRolloverEnabled,
    } = this.props;

    return (
      <EuiAccordion
        id="warm"
        buttonContent={
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <div
                style={{
                  background: '#DD0A73',
                  borderRadius: 4,
                  height: 64,
                  width: 64,
                  lineHeight: '64px',
                  textAlign: 'center',
                  color: 'white',
                }}
              >
                <EuiIcon type="sortDown" size="xl" />
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h4>Warm phase</h4>
              </EuiTitle>
              <EuiTextColor color="subdued">
                <EuiText>
                  <p>
                    This phase is optional. Your index is frequently queried,
                    but is read-only. Use this phase to optimize for search.
                  </p>
                </EuiText>
              </EuiTextColor>
              {isShowingErrors ? (
                <EuiTextColor color="danger">
                  <EuiText>
                    <p>This phase contains errors that need to be fixed.</p>
                  </EuiText>
                </EuiTextColor>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        buttonClassName="ilmAccordion__button"
        buttonContentClassName="ilmAccordion__buttonContent"
        extraAction={
          <EuiSwitch
            checked={phaseData[PHASE_ENABLED]}
            onChange={async e => {
              await setPhaseData(PHASE_ENABLED, e.target.checked);
              validate();
            }}
            label="Enable this phase"
          />
        }
      >
        <div style={{ padding: '16px 16px 16px 40px', marginLeft: '-16px' }}>
          <EuiTitle size="s">
            <p>Configuration</p>
          </EuiTitle>
          <EuiSpacer size="m" />
          {hotPhaseRolloverEnabled ? (
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiSwitch
                  label="Move to warm phase on rollover"
                  checked={this.state.applyOnRollover}
                  onChange={async e => {
                    await this.setState({ applyOnRollover: e.target.checked });
                    validate();
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}
          {!this.state.applyOnRollover ? (
            <EuiFlexGroup>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <ErrableFormRow
                  label="Move to warm phase after"
                  errorKey={PHASE_ROLLOVER_AFTER}
                  isShowingErrors={isShowingErrors}
                  errors={errors}
                >
                  <EuiFieldNumber
                    value={phaseData[PHASE_ROLLOVER_AFTER]}
                    onChange={async e => {
                      setPhaseData(PHASE_ROLLOVER_AFTER, e.target.value);
                      validate();
                    }}
                  />
                </ErrableFormRow>
              </EuiFlexItem>
              <EuiFlexItem style={{ maxWidth: 188 }}>
                <EuiFormRow hasEmptyLabelSpace>
                  <EuiSelect
                    value={phaseData[PHASE_ROLLOVER_AFTER_UNITS]}
                    onChange={async e => {
                      await setPhaseData(
                        PHASE_ROLLOVER_AFTER_UNITS,
                        e.target.value
                      );
                      validate();
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
            label="Where would you like to allocate these indices?"
            errorKey={PHASE_NODE_ATTRS}
            isShowingErrors={isShowingErrors}
            errors={errors}
            helpText={
              phaseData[PHASE_NODE_ATTRS] ? (
                <EuiButtonEmpty
                  flush="left"
                  onClick={() =>
                    showNodeDetailsFlyout(phaseData[PHASE_NODE_ATTRS])
                  }
                >
                  View node details
                </EuiButtonEmpty>
              ) : null
            }
          >
            <EuiSelect
              value={phaseData[PHASE_NODE_ATTRS]}
              options={nodeOptions}
              onChange={async e => {
                await setPhaseData(PHASE_NODE_ATTRS, e.target.value);
                validate();
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
                    validate();
                  }}
                />
              </ErrableFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow hasEmptyLabelSpace>
                <EuiButtonEmpty
                  flush="left"
                  onClick={async () => {
                    await setPhaseData(
                      PHASE_REPLICA_COUNT,
                      hotPhaseReplicaCount
                    );
                    validate();
                  }}
                >
                  Use number in hot phase
                </EuiButtonEmpty>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer />

          <EuiTitle size="s">
            <p>Shrink</p>
          </EuiTitle>
          <EuiTitle size="xs">
            <EuiTextColor color="subdued">
              Shrink the index into a new index with fewer primary shards.{' '}
              <EuiLink href="https://www.elastic.co/guide/en/elasticsearch/reference/master/indices-shrink-index.html#indices-shrink-index">
                Learn more.
              </EuiLink>
            </EuiTextColor>
          </EuiTitle>

          <EuiSpacer />

          <EuiSwitch
            checked={phaseData[PHASE_SHRINK_ENABLED]}
            onChange={async e => {
              await setPhaseData(PHASE_SHRINK_ENABLED, e.target.checked);
              validate();
            }}
            label="Enable shrink"
          />

          <EuiSpacer size="m" />

          {phaseData[PHASE_SHRINK_ENABLED] ? (
            <Fragment>
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
                        await setPhaseData(
                          PHASE_PRIMARY_SHARD_COUNT,
                          e.target.value
                        );
                        validate();
                      }}
                    />
                  </ErrableFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow hasEmptyLabelSpace>
                    <EuiButtonEmpty
                      flush="left"
                      onClick={async () => {
                        await setPhaseData(
                          PHASE_PRIMARY_SHARD_COUNT,
                          hotPhasePrimaryShardCount
                        );
                        validate();
                      }}
                    >
                      Use number in hot phase
                    </EuiButtonEmpty>
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer />
            </Fragment>
          ) : null}

          <EuiTitle size="s">
            <p>Force merge</p>
          </EuiTitle>
          <EuiTitle size="xs">
            <EuiTextColor color="subdued">
              Reduce the number of segments in your shard by and merging smaller
              files and clearing deleted ones.{' '}
              <EuiLink href="https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-forcemerge.html">
                Learn More
              </EuiLink>
            </EuiTextColor>
          </EuiTitle>

          <EuiSpacer size="m" />

          <EuiSwitch
            label="Force merge data"
            checked={phaseData[PHASE_FORCE_MERGE_ENABLED]}
            onChange={async e => {
              await setPhaseData(PHASE_FORCE_MERGE_ENABLED, e.target.checked);
              validate();
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
                  await setPhaseData(
                    PHASE_FORCE_MERGE_SEGMENTS,
                    e.target.value
                  );
                  validate();
                }}
              />
            </ErrableFormRow>
          ) : null}
        </div>
      </EuiAccordion>
    );
  }
}
