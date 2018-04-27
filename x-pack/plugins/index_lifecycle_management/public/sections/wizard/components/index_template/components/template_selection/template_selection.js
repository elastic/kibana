/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent } from 'react';
import PropTypes from 'prop-types';

import { EuiSelect, EuiLink } from '@elastic/eui';
import { ErrableFormRow } from '../../../../form_errors';
import { STRUCTURE_TEMPLATE_NAME } from '../../../../../../store/constants';

export class TemplateSelection extends PureComponent {
  static propTypes = {
    fetchIndexTemplates: PropTypes.func.isRequired,
    setSelectedIndexTemplate: PropTypes.func.isRequired,
    validate: PropTypes.func.isRequired,

    selectedIndexTemplateName: PropTypes.string.isRequired,
    templateOptions: PropTypes.array.isRequired,
    errors: PropTypes.object.isRequired,
    isShowingErrors: PropTypes.bool.isRequired,
  };

  componentWillMount() {
    this.props.fetchIndexTemplates();
  }

  render() {
    const {
      setSelectedIndexTemplate,
      validate,

      templateOptions,
      selectedIndexTemplateName,
      errors,
      isShowingErrors,
    } = this.props;

    // const noMatchingIndicesWarning =
    //   affectedIndices.length > 0 ? (
    //     <EuiCallOut
    //       style={{ marginBottom: '1rem' }}
    //       title="Warning"
    //       color="warning"
    //       iconType="help"
    //     >
    //       <p>
    //         The selected index template `{selectedIndexTemplateName}` matches
    //         existing indices which will not be affected by these changes.
    //       </p>
    //     </EuiCallOut>
    //   ) : null;

    return (
      <Fragment>
        {/* {noMatchingIndicesWarning} */}
        <ErrableFormRow
          label="Select a template"
          errorKey={STRUCTURE_TEMPLATE_NAME}
          isShowingErrors={isShowingErrors}
          errors={errors}
          helpText={
            <span>
              Learn how to{' '}
              <EuiLink href="https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-templates.html">
                add a new index template
              </EuiLink>.
            </span>
          }
        >
          <EuiSelect
            value={selectedIndexTemplateName}
            onChange={async e => {
              await setSelectedIndexTemplate(e.target.value);
              validate();
            }}
            options={templateOptions}
          />
        </ErrableFormRow>
      </Fragment>
    );
  }
}
