/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormHelpText,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { logisticalDetailsUrl } from '../../../services';

export class StepLogisticsUi extends Component {
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

    const illegalCharacters = ['\\', '/', '?', '"', '<', '>', '|'].join(', ');

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h3>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepLogistical.title"
                  defaultMessage="Logistics"
                />
              </h3>
            </EuiTitle>

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepLogistical.description"
                  defaultMessage="Define the manner in which data will be rolled up."
                />
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={logisticalDetailsUrl}
              target="_blank"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistical.readDocsButton.label"
                defaultMessage="Read the docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiForm>
          <EuiFormRow
            label={(
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistical.fieldName.label"
                defaultMessage="Rollup job name"
              />
            )}
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
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistical.sectionDataFlow.title"
                defaultMessage="Data flow"
              />
            </h4>
          </EuiTitle>

          <EuiText>
            <FormattedMessage
              id="xpack.rollupJobs.create.stepLogistical.sectionDataFlow.description"
              defaultMessage="Which indices do you want to pull data from and which rollup index should store this data?"
            />
          </EuiText>

          <EuiSpacer size="l" />

          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={(
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepLogistical.fieldIndexPattern.label"
                    defaultMessage="Index pattern"
                  />
                )}
                error={errorIndexPattern}
                isInvalid={Boolean(showStepErrors && errorIndexPattern)}
              >
                <EuiFieldText
                  aria-labelledby="indexPatternHelp"
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
                label={(
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepLogistical.fieldRollupIndex.label"
                    defaultMessage="Rollup index"
                  />
                )}
                error={errorRollupIndex}
                isInvalid={Boolean(showStepErrors && errorRollupIndex)}
              >
                <EuiFieldText
                  aria-labelledby="indexPatternHelp"
                  value={rollupIndex}
                  onChange={e => onFieldsChange({ rollupIndex: e.target.value })}
                  isInvalid={Boolean(showStepErrors && errorRollupIndex)}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFormHelpText id="indexPatternHelp">
            <p>
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistical.allowLabel"
                defaultMessage="You can use a {asterisk} as a wildcard in your index pattern."
                values={{ asterisk: <strong>*</strong> }}
              />
            </p>
            <p>
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistical.disallowLabel"
                defaultMessage="You can't use spaces or the characters {characterList}"
                values={{ characterList: <strong>{illegalCharacters}</strong> }}
              />
            </p>
          </EuiFormHelpText>

          <EuiSpacer size="l" />

          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistical.sectionSchedule.title"
                defaultMessage="Schedule"
              />
            </h4>
          </EuiTitle>

          <EuiText>
            <FormattedMessage
              id="xpack.rollupJobs.create.stepLogistical.sectionSchedule.description"
              defaultMessage={`
                How often should data be rolled up and how many results should be indexed at a time?
                A larger value will tend to execute faster, but will require more memory during processing.
              `}
            />
          </EuiText>

          <EuiSpacer size="l" />

          <EuiFormRow
            label={(
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistical.stepCron.label"
                defaultMessage="Cron"
              />
            )}
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
            label={(
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistical.stepPageSize.label"
                defaultMessage="Page size"
              />
            )}
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

        {this.renderErrors()}
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
        <EuiSpacer size="m" />
        <EuiCallOut
          title={(
            <FormattedMessage
              id="xpack.rollupJobs.create.stepLogistical.stepError.title"
              defaultMessage="Fix errors before going to next step"
            />
          )}
          color="danger"
          iconType="cross"
        />
      </Fragment>
    );
  }
}

export const StepLogistics = injectI18n(StepLogisticsUi);
