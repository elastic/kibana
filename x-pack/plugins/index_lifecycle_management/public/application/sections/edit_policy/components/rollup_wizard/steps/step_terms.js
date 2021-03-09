/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { FieldList } from '../components';

import { FieldChooser } from './components';

export class StepTerms extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    onFieldsChange: PropTypes.func.isRequired,
  };

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

    onFieldsChange({ terms: terms.filter((term) => term !== field) });
  };

  render() {
    const { fields } = this.props;

    const { terms } = fields;

    const columns = [
      {
        field: 'name',
        name: 'Field',
        sortable: true,
      },
    ];

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s" data-test-subj="rollupJobCreateTermsTitle">
              <h2>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.create.stepTermsTitle"
                  defaultMessage="Terms (optional)"
                />
              </h2>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.create.stepTermsDescription"
                  defaultMessage="Select the fields you want to bucket using terms aggregations.
                    This can be costly for high-cardinality fields such as IP addresses,
                    if the time bucket is sparse."
                />
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        <FieldList
          columns={columns}
          fields={terms}
          onRemoveField={this.onRemoveField}
          emptyMessage={<p>No terms fields added</p>}
          addButton={
            <FieldChooser
              buttonLabel={
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.create.stepTerms.fieldsChooserLabel"
                  defaultMessage="Add terms fields"
                />
              }
              columns={columns}
              selectedFields={terms}
              onSelectField={this.onSelectField}
              dataTestSubj="rollupJobTermsFieldChooser"
            />
          }
          dataTestSubj="rollupJobTermsFieldList"
        />
      </Fragment>
    );
  }
}
