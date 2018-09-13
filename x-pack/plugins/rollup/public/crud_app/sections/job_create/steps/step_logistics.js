/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/index_patterns';
import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/indices';
import { logisticalDetailsUrl } from '../../../services';

export class StepLogisticsUi extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    onFieldsChange: PropTypes.func.isRequired,
    fieldErrors: PropTypes.object.isRequired,
    areStepErrorsVisible: PropTypes.bool.isRequired,
    isValidatingIndexPattern: PropTypes.bool.isRequired,
    indexPatternAsyncErrors: PropTypes.array,
  }

  render() {
    const {
      fields,
      onFieldsChange,
      areStepErrorsVisible,
      fieldErrors,
      isValidatingIndexPattern,
      indexPatternAsyncErrors,
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

    const indexPatternIllegalCharacters = INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE.join(' ');
    const indexIllegalCharacters = INDEX_ILLEGAL_CHARACTERS_VISIBLE.join(' ');

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
          <EuiDescribedFormGroup
            title={(
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepLogistical.sectionId.title"
                    defaultMessage="ID"
                  />
                </h4>
              </EuiTitle>
            )}
            fullWidth
          >
            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepLogistical.fieldId.label"
                  defaultMessage="Rollup job ID"
                />
              )}
              error={errorId}
              isInvalid={Boolean(areStepErrorsVisible && errorId)}
              fullWidth
            >
              <EuiFieldText
                isInvalid={Boolean(areStepErrorsVisible && errorId)}
                value={id}
                onChange={e => onFieldsChange({ id: e.target.value })}
                fullWidth
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>

          <EuiDescribedFormGroup
            title={(
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepLogistical.sectionDataFlow.title"
                    defaultMessage="Data flow"
                  />
                </h4>
              </EuiTitle>
            )}
            description={(
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistical.sectionDataFlow.description"
                defaultMessage="Which indices do you want to pull data from and which rollup index should store this data?"
              />
            )}
            fullWidth
          >
            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepLogistical.fieldIndexPattern.label"
                  defaultMessage="Index pattern"
                />
              )}
              error={errorIndexPattern || indexPatternAsyncErrors}
              isInvalid={Boolean((areStepErrorsVisible && errorIndexPattern)) || Boolean(indexPatternAsyncErrors)}
              helpText={(
                <Fragment>
                  <p>
                    <FormattedMessage
                      id="xpack.rollupJobs.create.stepLogistical.fieldIndexPattern.helpAllow.label"
                      defaultMessage="You can use a {asterisk} as a wildcard in your index pattern."
                      values={{ asterisk: <strong>*</strong> }}
                    />
                  </p>
                  <p>
                    <FormattedMessage
                      id="xpack.rollupJobs.create.stepLogistical.fieldIndexPattern.helpDisallow.label"
                      defaultMessage="You can't use spaces or the characters {characterList}"
                      values={{ characterList: <strong>{indexPatternIllegalCharacters}</strong> }}
                    />
                  </p>
                </Fragment>
              )}
              fullWidth
            >
              <EuiFieldText
                value={indexPattern}
                onChange={e => onFieldsChange({ indexPattern: e.target.value })}
                isInvalid={Boolean(areStepErrorsVisible && errorIndexPattern) || Boolean(indexPatternAsyncErrors)}
                isLoading={isValidatingIndexPattern}
                fullWidth
              />
            </EuiFormRow>

            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepLogistical.fieldRollupIndex.label"
                  defaultMessage="Rollup index name"
                />
              )}
              error={errorRollupIndex}
              isInvalid={Boolean(areStepErrorsVisible && errorRollupIndex)}
              helpText={(
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepLogistical.fieldRollupIndex.helpDisallow.label"
                  defaultMessage="You can't use spaces, commas, or the characters {characterList}"
                  values={{ characterList: <strong>{indexIllegalCharacters}</strong> }}
                />
              )}
              fullWidth
            >
              <EuiFieldText
                value={rollupIndex}
                onChange={e => onFieldsChange({ rollupIndex: e.target.value })}
                isInvalid={Boolean(areStepErrorsVisible && errorRollupIndex)}
                fullWidth
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>

          <EuiDescribedFormGroup
            title={(
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepLogistical.sectionSchedule.title"
                    defaultMessage="Schedule"
                  />
                </h4>
              </EuiTitle>
            )}
            description={(
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistical.sectionSchedule.description"
                defaultMessage={`
                  How often should data be rolled up and how many results should be indexed at a time?
                  A larger page size will roll up data more quickly, but will require more memory during processing.
                `}
              />
            )}
            fullWidth
          >
            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepLogistical.fieldCron.label"
                  defaultMessage="Cron pattern"
                />
              )}
              error={errorRollupCron}
              isInvalid={Boolean(areStepErrorsVisible && errorRollupCron)}
              fullWidth
            >
              <EuiFieldText
                value={rollupCron}
                onChange={e => onFieldsChange({ rollupCron: e.target.value })}
                isInvalid={Boolean(areStepErrorsVisible && errorRollupCron)}
                fullWidth
              />
            </EuiFormRow>

            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepLogistical.fieldPageSize.label"
                  defaultMessage="Page size"
                />
              )}
              error={errorRollupPageSize}
              isInvalid={Boolean(areStepErrorsVisible && errorRollupPageSize)}
              fullWidth
            >
              <EuiFieldNumber
                value={rollupPageSize}
                onChange={e => onFieldsChange({ rollupPageSize: e.target.value })}
                isInvalid={Boolean(areStepErrorsVisible && errorRollupPageSize)}
                fullWidth
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </EuiForm>

        {this.renderErrors()}
      </Fragment>
    );
  }

  renderErrors = () => {
    const { areStepErrorsVisible } = this.props;

    if (!areStepErrorsVisible) {
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
