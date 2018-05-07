/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent } from 'react';
import PropTypes from 'prop-types';

import { EuiSelect } from '@elastic/eui';
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
          label="Template name"
          errorKey={STRUCTURE_TEMPLATE_NAME}
          isShowingErrors={isShowingErrors}
          errors={errors}
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
