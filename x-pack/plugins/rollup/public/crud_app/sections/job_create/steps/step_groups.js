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
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import {
  groupsDetailsUrl,
} from '../../../services';

import {
  FieldChooser,
  FieldList,
} from './components';

export class StepGroupsUi extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    onFieldsChange: PropTypes.func.isRequired,
    termsFields: PropTypes.array.isRequired,
    histogramFields: PropTypes.array.isRequired,
  }

  onSelectField = (field) => {
    const {
      fields: { terms },
      onFieldsChange,
    } = this.props;

    onFieldsChange({ terms: terms.concat(field) });
  };

  onRemoveField = (field) => {
    const {
      fields: { terms },
      onFieldsChange,
    } = this.props;

    onFieldsChange({ terms: terms.filter(term => term !== field) });
  };

  render() {
    const {
      fields,
      termsFields,
      // histogramFields,
    } = this.props;

    const {
      terms,
      // histogram,
      // histogramInterval,
    } = fields;

    const unselectedTermsFields = termsFields.filter(termField => {
      return !fields.terms.includes(termField);
    });

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h3>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepGroups.title"
                  defaultMessage="Groups"
                />
              </h3>
            </EuiTitle>

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepGroups.description"
                  defaultMessage={`
                    Choose which fields should be grouped on, and with what aggregations. These
                    fields will be available when you aggregate the rolled-up data into buckets.
                  `}
                />
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={groupsDetailsUrl}
              target="_blank"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.rollupJobs.create.stepGroups.readDocsButton.label"
                defaultMessage="Read the docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiForm>
          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                id="xpack.rollupJobs.create.stepGroups.sectionTerms.title"
                defaultMessage="Terms (optional)"
              />
            </h4>
          </EuiTitle>

          <EuiText>
            <FormattedMessage
              id="xpack.rollupJobs.create.stepGroups.sectionTerms.description"
              defaultMessage={`
                Select the fields you want to bucket using terms aggregations. This can be
                potentially costly for high-cardinality groups such as IP addresses, especially
                if the time-bucket is particularly sparse.
              `}
            />
          </EuiText>

          <FieldList
            fields={terms}
            onRemoveField={this.onRemoveField}
          />

          <EuiSpacer />

          <FieldChooser
            label={(
              <FormattedMessage
                id="xpack.rollupJobs.create.stepGroups.sectionTerms.fieldsChooser.label"
                defaultMessage="Select terms fields"
              />
            )}
            fields={unselectedTermsFields}
            onSelectField={this.onSelectField}
          />

          <EuiSpacer size="l" />

          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                id="xpack.rollupJobs.create.stepGroups.sectionHistogram.title"
                defaultMessage="Histogram (optional)"
              />
            </h4>
          </EuiTitle>

          <EuiText>
            <FormattedMessage
              id="xpack.rollupJobs.create.stepGroups.sectionHistogram.description"
              defaultMessage={`
                Select the fields you want to bucket using numeric histgogram intervals. Note that
                all fields being grouped via the histogram must share the same interval.
              `}
            />
          </EuiText>

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
              id="xpack.rollupJobs.create.stepGroups.stepError.title"
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

export const StepGroups = injectI18n(StepGroupsUi);
