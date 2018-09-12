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
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import {
  histogramDetailsUrl,
} from '../../../services';

import {
  FieldChooser,
  FieldList,
} from './components';

export class StepHistogramUi extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    onFieldsChange: PropTypes.func.isRequired,
    histogramFields: PropTypes.array.isRequired,
  }

  onSelectField = (field) => {
    const {
      fields: { histogram },
      onFieldsChange,
    } = this.props;

    onFieldsChange({ histogram: histogram.concat(field) });
  };

  onRemoveField = (field) => {
    const {
      fields: { histogram },
      onFieldsChange,
    } = this.props;

    onFieldsChange({ histogram: histogram.filter(histogramField => histogramField !== field) });
  };

  render() {
    const {
      fields,
      histogramFields,
    } = this.props;

    const {
      histogram,
      // histogramInterval,
    } = fields;

    const unselectedHistogramFields = histogramFields.filter(histogramField => {
      return !fields.histogram.includes(histogramField);
    });

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h3>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepHistogram.title"
                  defaultMessage="Histogram (optional)"
                />
              </h3>
            </EuiTitle>

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepHistogram.description"
                  defaultMessage={`
                    Select the fields you want to bucket using numeric histgogram intervals. Note that
                    all fields being grouped via the histogram must share the same interval.
                  `}
                />
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={histogramDetailsUrl}
              target="_blank"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.rollupJobs.create.stepHistogram.readDocsButton.label"
                defaultMessage="Read the docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <FieldList
          fields={histogram}
          onRemoveField={this.onRemoveField}
        />

        <EuiSpacer />

        <FieldChooser
          label={(
            <FormattedMessage
              id="xpack.rollupJobs.create.stepHistogram.fieldsChooser.label"
              defaultMessage="Select histogram fields"
            />
          )}
          fields={unselectedHistogramFields}
          onSelectField={this.onSelectField}
        />
      </Fragment>
    );
  }
}

export const StepHistogram = injectI18n(StepHistogramUi);
