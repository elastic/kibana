/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';

import {
  EuiCallOut,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

export class StepIndices extends Component {
  render() {
    const {
      fields,
      onFieldsChange,
      showStepErrors,
      fieldErrors,
    } = this.props;

    const {
      id,
      indexPattern,
      rollupIndex,
      rollupCron,
      rollupPageSize,
    } = fields;

    const {
      id: errorId,
      indexPattern: errorIndexPattern,
      rollupIndex: errorRollupIndex,
      rollupCron: errorRollupCron,
      rollupPageSize: errorRollupPageSize,
    } = fieldErrors;

    return (
      <Fragment>
        <EuiTitle>
          <h3>
            Indices
          </h3>
        </EuiTitle>

        <EuiSpacer size="l" />

        {this.renderErrors()}

        <EuiForm>
          <EuiFormRow
            label="Rollup job name"
            error={errorId}
            isInvalid={Boolean(showStepErrors && errorId)}
          >
            <EuiFieldText
              isInvalid={Boolean(showStepErrors && errorId)}
              value={id}
              onChange={e => onFieldsChange({ id: e.target.value })}
            />
          </EuiFormRow>

          <EuiTitle size="s">
            <h4>
              Data flow
            </h4>
          </EuiTitle>

          <EuiText>
            Where should data to be pulled from and where should it be stored when
            it&rsquo; rolled up?
          </EuiText>

          <EuiSpacer size="l" />

          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label="Index pattern"
                error={errorIndexPattern}
                isInvalid={Boolean(showStepErrors && errorIndexPattern)}
              >
                <EuiFieldText
                  value={indexPattern}
                  onChange={e => onFieldsChange({ indexPattern: e.target.value })}
                  isInvalid={Boolean(showStepErrors && errorIndexPattern)}
                />
              </EuiFormRow>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFormRow hasEmptyLabelSpace>
                <EuiIcon type="arrowRight" />
              </EuiFormRow>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFormRow
                label="Rollup index"
                error={errorRollupIndex}
                isInvalid={Boolean(showStepErrors && errorRollupIndex)}
              >
                <EuiFieldText
                  value={rollupIndex}
                  onChange={e => onFieldsChange({ rollupIndex: e.target.value })}
                  isInvalid={Boolean(showStepErrors && errorRollupIndex)}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          <EuiTitle size="s">
            <h4>
              Schedule
            </h4>
          </EuiTitle>

          <EuiText>
            How often should data be rolled up and how many results should be indexed at a time?
          </EuiText>

          <EuiSpacer size="l" />

          <EuiFormRow
            label="Cron"
            error={errorRollupCron}
            isInvalid={Boolean(showStepErrors && errorRollupCron)}
          >
            <EuiFieldText
              value={rollupCron}
              onChange={e => onFieldsChange({ rollupCron: e.target.value })}
              isInvalid={Boolean(showStepErrors && errorRollupCron)}
            />
          </EuiFormRow>

          <EuiFormRow
            label="Page size"
            error={errorRollupPageSize}
            isInvalid={Boolean(showStepErrors && errorRollupPageSize)}
          >
            <EuiFieldNumber
              value={rollupPageSize}
              onChange={e => onFieldsChange({ rollupPageSize: e.target.value })}
              isInvalid={Boolean(showStepErrors && errorRollupPageSize)}
            />
          </EuiFormRow>
        </EuiForm>
      </Fragment>
    );
  }

  renderErrors = () => {
    const { showStepErrors } = this.props;

    if (!showStepErrors) {
      return null;
    }

    return (
      <Fragment>
        <EuiCallOut
          title="Fix errors before going to next step"
          color="danger"
          iconType="cross"
        />
        <EuiSpacer size="m" />
      </Fragment>
    );
  }
}
