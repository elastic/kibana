/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { CronEditor } from '@kbn/es-ui-shared-plugin/public';
import { indexPatterns } from '@kbn/data-plugin/public';

import { indices } from '../../../../shared_imports';
import { documentationLinks } from '../../../services/documentation_links';
import { StepError } from './components';

const indexPatternIllegalCharacters = indexPatterns.ILLEGAL_CHARACTERS_VISIBLE.join(' ');
const indexIllegalCharacters = indices.INDEX_ILLEGAL_CHARACTERS_VISIBLE.join(' ');

export class StepLogistics extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    onFieldsChange: PropTypes.func.isRequired,
    fieldErrors: PropTypes.object.isRequired,
    hasErrors: PropTypes.bool.isRequired,
    areStepErrorsVisible: PropTypes.bool.isRequired,
    isValidatingIndexPattern: PropTypes.bool.isRequired,
    hasMatchingIndices: PropTypes.bool.isRequired,
    indexPatternAsyncErrors: PropTypes.array,
  };
  state = { cronFocus: false };

  showAdvancedCron = () => {
    this.setState({ cronFocus: true });
    const { onFieldsChange } = this.props;

    onFieldsChange({
      isAdvancedCronVisible: true,
    });
  };

  hideAdvancedCron = () => {
    this.setState({ cronFocus: true });
    const { onFieldsChange, fields } = this.props;
    const { simpleRollupCron } = fields;

    onFieldsChange({
      isAdvancedCronVisible: false,
      // Restore the last value of the simple cron editor.
      rollupCron: simpleRollupCron,
    });
  };

  renderIndexPatternHelpText() {
    const { isValidatingIndexPattern, hasMatchingIndices } = this.props;

    if (!isValidatingIndexPattern && hasMatchingIndices) {
      return (
        <EuiTextColor color="success" data-test-subj="fieldIndexPatternSuccessMessage">
          <p>
            <FormattedMessage
              id="xpack.rollupJobs.create.stepLogistics.fieldIndexPattern.helpHasMatchesLabel"
              defaultMessage="Success! Index pattern has matching indices."
            />
          </p>
        </EuiTextColor>
      );
    }

    let indexPatternValidationStatus;

    if (isValidatingIndexPattern) {
      indexPatternValidationStatus = (
        <p>
          <FormattedMessage
            id="xpack.rollupJobs.create.stepLogistics.fieldIndexPattern.helpSearchingLabel"
            defaultMessage="Looking for matching indices..."
          />
        </p>
      );
    } else {
      indexPatternValidationStatus = (
        <p>
          <FormattedMessage
            id="xpack.rollupJobs.create.stepLogistics.fieldIndexPattern.helpMustMatchLabel"
            defaultMessage="Index pattern must match at least one index that is not a rollup."
          />
        </p>
      );
    }

    return (
      <Fragment>
        {indexPatternValidationStatus}
        <p>
          <FormattedMessage
            id="xpack.rollupJobs.create.stepLogistics.fieldIndexPattern.helpAllowLabel"
            defaultMessage="Use a wildcard ({asterisk}) to match multiple indices."
            values={{ asterisk: <strong>*</strong> }}
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.rollupJobs.create.stepLogistics.fieldIndexPattern.helpDisallowLabel"
            defaultMessage="Spaces and the characters {characterList} are not allowed."
            values={{ characterList: <strong>{indexPatternIllegalCharacters}</strong> }}
          />
        </p>
      </Fragment>
    );
  }

  renderCronEditor() {
    const { fields, onFieldsChange, areStepErrorsVisible, fieldErrors } = this.props;

    const { rollupCron, cronFrequency, isAdvancedCronVisible, fieldToPreferredValueMap } = fields;

    const { rollupCron: errorRollupCron } = fieldErrors;

    if (isAdvancedCronVisible) {
      return (
        <Fragment>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistics.fieldCronLabel"
                defaultMessage="Cron expression"
              />
            }
            error={errorRollupCron}
            isInvalid={Boolean(areStepErrorsVisible && errorRollupCron)}
            helpText={
              <p>
                <EuiLink href={documentationLinks.apis.cronExpressions} target="_blank">
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepLogistics.fieldCron.helpReferenceLinkLabel"
                    defaultMessage="Learn more about cron expressions"
                  />
                </EuiLink>
              </p>
            }
            fullWidth
          >
            <EuiFieldText
              autoFocus={this.state.cronFocus}
              value={rollupCron}
              onChange={(e) => onFieldsChange({ rollupCron: e.target.value })}
              isInvalid={Boolean(areStepErrorsVisible && errorRollupCron)}
              fullWidth
              data-test-subj="rollupAdvancedCron"
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          <EuiText size="s">
            <EuiLink onClick={this.hideAdvancedCron}>
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistics.sectionSchedule.buttonBasicLabel"
                defaultMessage="Create basic interval"
              />
            </EuiLink>
          </EuiText>
        </Fragment>
      );
    }

    return (
      <Fragment>
        <CronEditor
          autoFocus={this.state.cronFocus}
          fieldToPreferredValueMap={fieldToPreferredValueMap}
          cronExpression={rollupCron}
          frequency={cronFrequency}
          onChange={({ cronExpression, frequency, fieldToPreferredValueMap }) =>
            onFieldsChange({
              rollupCron: cronExpression,
              simpleRollupCron: cronExpression,
              cronFrequency: frequency,
              fieldToPreferredValueMap,
            })
          }
        />

        <EuiSpacer size="s" />

        <EuiText size="s">
          <EuiLink onClick={this.showAdvancedCron} data-test-subj="rollupShowAdvancedCronLink">
            <FormattedMessage
              id="xpack.rollupJobs.create.stepLogistics.sectionSchedule.buttonAdvancedLabel"
              defaultMessage="Create cron expression"
            />
          </EuiLink>
        </EuiText>
      </Fragment>
    );
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

    const { id, indexPattern, rollupIndex, rollupPageSize, rollupDelay } = fields;

    const {
      id: errorId,
      indexPattern: errorIndexPattern,
      rollupIndex: errorRollupIndex,
      rollupPageSize: errorRollupPageSize,
      rollupDelay: errorRollupDelay,
    } = fieldErrors;

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle data-test-subj="rollupJobCreateLogisticsTitle">
              <h2>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepLogisticsTitle"
                  defaultMessage="Logistics"
                />
              </h2>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepLogistics.logisticsDescription"
                  defaultMessage="Define how to run the rollup job and when to index the documents."
                />
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={documentationLinks.apis.createRollupJobsRequest}
              target="_blank"
              iconType="help"
              data-test-subj="rollupJobCreateLogisticsDocsButton"
            >
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistics.readDocsButtonLabel"
                defaultMessage="Logistics docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiForm>
          <EuiDescribedFormGroup
            title={
              <EuiTitle size="s">
                <h3>
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepLogistics.sectionIdTitle"
                    defaultMessage="Name"
                  />
                </h3>
              </EuiTitle>
            }
            description={
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistics.sectionIdDescription"
                defaultMessage="This name will be used as a unique identifier for this rollup job."
              />
            }
            fullWidth
          >
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepLogistics.fieldIdLabel"
                  defaultMessage="Name"
                />
              }
              error={errorId}
              isInvalid={Boolean(areStepErrorsVisible && errorId)}
              fullWidth
            >
              <EuiFieldText
                isInvalid={Boolean(areStepErrorsVisible && errorId)}
                value={id}
                onChange={(e) => onFieldsChange({ id: e.target.value })}
                fullWidth
                data-test-subj="rollupJobName"
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>

          <EuiDescribedFormGroup
            title={
              <EuiTitle size="s">
                <h3>
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepLogistics.sectionDataFlowTitle"
                    defaultMessage="Data flow"
                  />
                </h3>
              </EuiTitle>
            }
            description={
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistics.sectionDataFlowDescription"
                defaultMessage="Which indices do you want to roll up and where do you want to store the data?"
              />
            }
            fullWidth
          >
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepLogistics.fieldIndexPatternLabel"
                  defaultMessage="Index pattern"
                />
              }
              error={
                isValidatingIndexPattern ? undefined : errorIndexPattern || indexPatternAsyncErrors
              }
              isInvalid={
                Boolean(areStepErrorsVisible && errorIndexPattern) ||
                Boolean(indexPatternAsyncErrors)
              }
              helpText={this.renderIndexPatternHelpText()}
              fullWidth
            >
              <EuiFieldText
                value={indexPattern}
                onChange={(e) => onFieldsChange({ indexPattern: e.target.value })}
                isInvalid={
                  Boolean(areStepErrorsVisible && errorIndexPattern) ||
                  Boolean(indexPatternAsyncErrors)
                }
                isLoading={isValidatingIndexPattern}
                fullWidth
                data-test-subj="rollupIndexPattern"
              />
            </EuiFormRow>

            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepLogistics.fieldRollupIndexLabel"
                  defaultMessage="Rollup index name"
                />
              }
              error={errorRollupIndex}
              isInvalid={Boolean(areStepErrorsVisible && errorRollupIndex)}
              helpText={
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepLogistics.fieldRollupIndex.helpDisallowLabel"
                  defaultMessage="Spaces, commas, and the characters {characterList} are not allowed."
                  values={{ characterList: <strong>{indexIllegalCharacters}</strong> }}
                />
              }
              fullWidth
            >
              <EuiFieldText
                value={rollupIndex}
                onChange={(e) => onFieldsChange({ rollupIndex: e.target.value })}
                isInvalid={Boolean(areStepErrorsVisible && errorRollupIndex)}
                fullWidth
                data-test-subj="rollupIndexName"
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>

          <EuiDescribedFormGroup
            title={
              <EuiTitle size="s">
                <h3>
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepLogistics.sectionScheduleTitle"
                    defaultMessage="Schedule"
                  />
                </h3>
              </EuiTitle>
            }
            description={
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistics.sectionScheduleDescription"
                defaultMessage="How often do you want to roll up the data?"
              />
            }
            fullWidth
          >
            {this.renderCronEditor()}
          </EuiDescribedFormGroup>

          <EuiDescribedFormGroup
            title={
              <EuiTitle size="xs">
                <h4>
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepLogistics.sectionPageSizeTitle"
                    defaultMessage="How many documents do you want to roll up at a time?"
                  />
                </h4>
              </EuiTitle>
            }
            description={
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistics.sectionPageSizeDescription"
                defaultMessage="A larger page size will roll up data quicker, but requires more memory."
              />
            }
            fullWidth
          >
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepLogistics.fieldPageSizeLabel"
                  defaultMessage="Page size"
                />
              }
              error={errorRollupPageSize}
              isInvalid={Boolean(areStepErrorsVisible && errorRollupPageSize)}
              fullWidth
            >
              <EuiFieldNumber
                value={rollupPageSize ? Number(rollupPageSize) : ''}
                onChange={(e) => onFieldsChange({ rollupPageSize: e.target.value })}
                isInvalid={Boolean(areStepErrorsVisible && errorRollupPageSize)}
                fullWidth
                min={0}
                data-test-subj="rollupPageSize"
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>

          <EuiDescribedFormGroup
            title={
              <EuiTitle size="xs">
                <h4>
                  <FormattedMessage
                    id="xpack.rollupJobs.create.stepLogistics.sectionDelayTitle"
                    defaultMessage="How long should the rollup job wait before rolling up new data?"
                  />
                </h4>
              </EuiTitle>
            }
            description={
              <FormattedMessage
                id="xpack.rollupJobs.create.stepLogistics.sectionDelayDescription"
                defaultMessage="A latency buffer will delay rolling up data. This will yield a
                  higher-fidelity rollup by allowing for variable ingest latency. By default, the
                  rollup job attempts to roll up all data that is available."
              />
            }
            fullWidth
          >
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepDateHistogram.fieldDelayLabel"
                  defaultMessage="Latency buffer (optional)"
                />
              }
              error={errorRollupDelay}
              isInvalid={Boolean(areStepErrorsVisible && errorRollupDelay)}
              helpText={
                <Fragment>
                  <p>
                    <FormattedMessage
                      id="xpack.rollupJobs.create.stepDateHistogram.fieldDelay.helpExampleLabel"
                      defaultMessage="Example values: 30s, 20m, 24h, 2d, 1w, 1M"
                    />
                  </p>
                </Fragment>
              }
              fullWidth
            >
              <EuiFieldText
                value={rollupDelay || ''}
                onChange={(e) => onFieldsChange({ rollupDelay: e.target.value })}
                isInvalid={Boolean(areStepErrorsVisible && errorRollupDelay)}
                fullWidth
                data-test-subj="rollupDelay"
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </EuiForm>

        {this.renderErrors()}
      </Fragment>
    );
  }

  renderErrors = () => {
    const { areStepErrorsVisible, hasErrors } = this.props;

    if (!areStepErrorsVisible || !hasErrors) {
      return null;
    }

    return <StepError />;
  };
}
