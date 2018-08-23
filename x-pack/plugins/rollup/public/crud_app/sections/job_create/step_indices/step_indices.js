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
          <EuiFormRow label="Rollup job name">
            <EuiFieldText
              isInvalid={showStepErrors && fieldErrors.name}
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
              <EuiFormRow label="Index pattern">
                <EuiFieldText
                  value={indexPattern}
                  onChange={e => onFieldsChange({ indexPattern: e.target.value })}
                />
              </EuiFormRow>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFormRow hasEmptyLabelSpace>
                <EuiIcon type="arrowRight" />
              </EuiFormRow>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiFormRow label="Rollup index">
                <EuiFieldText
                  value={rollupIndex}
                  onChange={e => onFieldsChange({ rollupIndex: e.target.value })}
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

          <EuiFormRow label="Cron">
            <EuiFieldText
              value={rollupCron}
              onChange={e => onFieldsChange({ rollupCron: e.target.value })}
            />
          </EuiFormRow>

          <EuiFormRow label="Page size">
            <EuiFieldNumber
              value={rollupPageSize}
              onChange={e => onFieldsChange({ rollupPageSize: e.target.value })}
            />
          </EuiFormRow>
        </EuiForm>
      </Fragment>
    );
  }

  renderErrors = () => {
    const { showStepErrors, fieldErrors } = this.props;

    if (!showStepErrors) {
      return null;
    }

    const { name } = fieldErrors;

    if (name) {
      return (
        <Fragment>
          <EuiCallOut
            title="You must name your deployment template before saving it"
            color="danger"
            iconType="cross"
          />
          <EuiSpacer size="m" />
        </Fragment>
      );
    }
  }
}
